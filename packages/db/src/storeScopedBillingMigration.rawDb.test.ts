import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type postgres from "postgres";
import { describe, expect, it } from "vitest";
import {
  createLegacyTables,
  openDatabase,
} from "./storeScopedBillingMigration.rawDb.testSupport.js";

const runRawDb = process.env.RUN_RAW_POSTGRES_TESTS === "true";
const migration = readFileSync(
  new URL(
    "../migrations/0078_store_scoped_billing_subscriptions.sql",
    import.meta.url,
  ),
  "utf8",
);

describe.skipIf(!runRawDb)("store-scoped billing migration", () => {
  it("splits a shared legacy recurrence conservatively and is rerunnable", async () => {
    const sql = openDatabase();
    const tenantId = randomUUID();
    const firstStoreId = randomUUID();
    const secondStoreId = randomUUID();
    const subscriptionId = randomUUID();
    const firstHireId = randomUUID();
    const secondHireId = randomUUID();

    try {
      await sql.begin(async (tx) => {
        await createLegacyTables(tx);
        await tx.unsafe("SET LOCAL search_path = pg_temp, public");
        await tx`
          INSERT INTO stores (id, tenant_id) VALUES
            (${firstStoreId}, ${tenantId}), (${secondStoreId}, ${tenantId})
        `;
        await tx`
          INSERT INTO plans (id, catalog_version, code, status, published_at)
          VALUES (gen_random_uuid(), '2026-08-v3', 'free', 'active', now())
        `;
        await tx`
          INSERT INTO plan_features (plan_id, feature_key, included)
          SELECT id, 'storefront', 1 FROM plans WHERE code = 'free'
        `;
        await tx`
          INSERT INTO subscriptions (
            id, billing_customer_id, provider, provider_subscription_id,
            status, tenant_id
          ) VALUES (
            ${subscriptionId}, ${randomUUID()}, 'asaas', 'sub_ambiguous',
            'active', ${tenantId}
          )
        `;
        await tx`
          INSERT INTO billing_plan_hires (
            id, subscription_id, tenant_id, store_id, provider,
            provider_subscription_id, provider_payment_id
          ) VALUES
            (${firstHireId}, ${subscriptionId}, ${tenantId}, ${firstStoreId}, 'asaas', 'sub_ambiguous', 'pay_first'),
            (${secondHireId}, ${subscriptionId}, ${tenantId}, ${secondStoreId}, 'asaas', 'sub_ambiguous', 'pay_second')
        `;
        await tx`
          INSERT INTO subscription_items (
            item_type, plan_id, starts_at, store_id, subscription_id,
            tenant_id, unit_amount_cents
          ) VALUES
            ('plan', ${randomUUID()}, now() + interval '1 day', ${firstStoreId}, ${subscriptionId}, ${tenantId}, 19700),
            ('plan', ${randomUUID()}, now(), ${secondStoreId}, ${subscriptionId}, ${tenantId}, 39700)
        `;
        await tx`
          INSERT INTO payments (
            external_reference, subscription_id, store_id, tenant_id
          ) VALUES (${firstHireId}, ${subscriptionId}, NULL, ${tenantId})
        `;
        await tx`
          INSERT INTO billing_checkout_sessions (
            external_reference, subscription_id, store_id, tenant_id
          ) VALUES (${secondHireId}, ${subscriptionId}, NULL, ${tenantId})
        `;
        await tx`
          INSERT INTO store_entitlements (
            feature_key, source, status, store_id, tenant_id
          ) VALUES
            ('storefront', 'billing_catalog', 'active', ${firstStoreId}, ${tenantId}),
            ('finance', 'billing_catalog', 'active', ${firstStoreId}, ${tenantId}),
            ('storefront', 'billing_catalog', 'active', ${secondStoreId}, ${tenantId}),
            ('finance', 'billing_catalog', 'active', ${secondStoreId}, ${tenantId})
        `;

        await tx.unsafe(migration);
        await assertMigrated(tx, tenantId, [firstStoreId, secondStoreId]);
        const [scopedSubscription] = await tx<
          Array<{ id: string; storeId: string }>
        >`
          SELECT id, store_id AS "storeId" FROM subscriptions
          WHERE tenant_id = ${tenantId} ORDER BY store_id LIMIT 1
        `;
        expect(scopedSubscription).toBeDefined();
        if (!scopedSubscription)
          throw new Error("Expected scoped subscription");
        await tx`
          INSERT INTO billing_provider_reconciliations (
            kind, status, store_id, subscription_id, tenant_id,
            target_provider_subscription_id
          ) VALUES
            ('subscription_cancellation', 'processing', ${scopedSubscription?.storeId}, ${scopedSubscription?.id}, ${tenantId}, 'sub_old'),
            ('subscription_cancellation', 'queued', ${scopedSubscription?.storeId}, ${scopedSubscription?.id}, ${tenantId}, 'sub_new')
        `;
        const [cancellationCount] = await tx<Array<{ count: number }>>`
          SELECT count(*)::int AS count
          FROM billing_provider_reconciliations
          WHERE kind = 'subscription_cancellation'
        `;
        expect(cancellationCount?.count).toBe(2);
        await expect(
          tx.savepoint(async (savepoint) => {
            await savepoint`
              INSERT INTO billing_provider_reconciliations (
                kind, status, store_id, subscription_id, tenant_id,
                target_provider_subscription_id
              ) VALUES (
                'catalog_migration', 'queued', ${scopedSubscription.storeId},
                ${scopedSubscription.id}, ${tenantId}, 'invalid_target'
              )
            `;
          }),
        ).rejects.toMatchObject({ code: "23514" });
        const otherStoreId = [firstStoreId, secondStoreId].find(
          (storeId) => storeId !== scopedSubscription.storeId,
        );
        expect(otherStoreId).toBeDefined();
        if (!otherStoreId) throw new Error("Expected another store");
        await expect(
          tx.savepoint(async (savepoint) => {
            await savepoint`
              INSERT INTO billing_provider_reconciliations (
                kind, status, store_id, subscription_id, tenant_id
              ) VALUES (
                'free_fallback', 'queued', ${otherStoreId},
                ${scopedSubscription.id}, ${tenantId}
              )
            `;
          }),
        ).rejects.toMatchObject({ code: "23503" });

        const processingToken = randomUUID();
        await tx`
          UPDATE billing_provider_reconciliations
          SET
            attempt_count = 4,
            available_at = '2026-08-20T10:00:00Z',
            completed_at = '2026-08-20T10:05:00Z',
            last_error = 'historical_terminal_evidence',
            status = 'succeeded',
            updated_at = '2026-08-20T10:05:00Z'
          WHERE kind = 'catalog_migration' AND tenant_id = ${tenantId}
            AND store_id = ${firstStoreId}
        `;
        await tx`
          UPDATE billing_provider_reconciliations
          SET
            attempt_count = 3,
            available_at = '2026-08-20T11:00:00Z',
            last_error = 'historical_processing_evidence',
            processing_started_at = '2026-08-20T11:01:00Z',
            processing_token = ${processingToken},
            status = 'processing',
            updated_at = '2026-08-20T11:01:00Z'
          WHERE kind = 'catalog_migration' AND tenant_id = ${tenantId}
            AND store_id = ${secondStoreId}
        `;
        const reconciliationStateBefore = await readCatalogReconciliationState(
          tx,
          tenantId,
        );
        await tx`
          UPDATE billing_plan_hires
          SET provider_subscription_id = 'sub_replayed_ambiguous'
          WHERE tenant_id = ${tenantId}
        `;

        await tx.unsafe(
          'DROP TABLE "billing_shared_subscription_targets", "billing_subscription_store_targets", "billing_ambiguous_provider_subscription_scopes", "billing_ambiguous_provider_subscription_ids", "billing_shared_subscription_ids", "billing_subscription_store_links"',
        );
        await tx.unsafe(migration);
        await assertMigrated(tx, tenantId, [firstStoreId, secondStoreId]);
        expect(await readCatalogReconciliationState(tx, tenantId)).toEqual(
          reconciliationStateBefore,
        );
      });
    } finally {
      await sql.end();
    }
  });

  it("rolls back every change when preflight evidence is ambiguous", async () => {
    const sql = openDatabase();
    try {
      await sql.begin(async (tx) => {
        await createLegacyTables(tx);
        await tx.unsafe("SET LOCAL search_path = pg_temp, public");
        const tenantId = randomUUID();
        const storeId = randomUUID();
        const subscriptionId = randomUUID();
        await tx`INSERT INTO stores (id, tenant_id) VALUES (${storeId}, ${tenantId})`;
        await tx`
          INSERT INTO subscriptions (
            id, billing_customer_id, provider, provider_subscription_id,
            status, tenant_id
          ) VALUES (
            ${subscriptionId}, ${randomUUID()}, 'asaas', 'sub_preserved',
            'active', ${tenantId}
          )
        `;
        await tx`
          INSERT INTO subscription_items (
            item_type, store_id, subscription_id, tenant_id, unit_amount_cents
          ) VALUES ('plan', ${storeId}, ${subscriptionId}, ${tenantId}, 19700)
        `;
        await tx`
          INSERT INTO payments (subscription_id, tenant_id)
          VALUES (${subscriptionId}, ${tenantId})
        `;
        await expect(
          tx.savepoint(async (savepoint) => savepoint.unsafe(migration)),
        ).rejects.toThrow(/preflight failed/i);
        const [subscription] = await tx<
          Array<{ providerSubscriptionId: string }>
        >`
          SELECT provider_subscription_id AS "providerSubscriptionId"
          FROM subscriptions WHERE id = ${subscriptionId}
        `;
        expect(subscription?.providerSubscriptionId).toBe("sub_preserved");
        const [storeColumn] = await tx<Array<{ exists: boolean }>>`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema LIKE 'pg_temp_%'
              AND table_name = 'subscriptions' AND column_name = 'store_id'
          ) AS exists
        `;
        expect(storeColumn?.exists).toBe(false);
      });
    } finally {
      await sql.end();
    }
  });
});

async function assertMigrated(
  sql: postgres.TransactionSql,
  tenantId: string,
  storeIds: readonly string[],
) {
  const subscriptions = await sql<
    Array<{
      providerSubscriptionId: string | null;
      status: string;
      storeId: string;
    }>
  >`
    SELECT provider_subscription_id AS "providerSubscriptionId", status,
      store_id AS "storeId"
    FROM subscriptions WHERE tenant_id = ${tenantId} ORDER BY store_id
  `;
  expect(subscriptions).toHaveLength(2);
  expect(subscriptions.map((row) => row.storeId).sort()).toEqual(
    [...storeIds].sort(),
  );
  expect(subscriptions.every((row) => row.status === "active")).toBe(true);
  expect(
    subscriptions.every((row) => row.providerSubscriptionId === null),
  ).toBe(true);
  const hires = await sql<
    Array<{
      providerPaymentId: string | null;
      providerSubscriptionId: string | null;
    }>
  >`
    SELECT provider_payment_id AS "providerPaymentId",
      provider_subscription_id AS "providerSubscriptionId"
    FROM billing_plan_hires WHERE tenant_id = ${tenantId}
  `;
  expect(hires).toHaveLength(2);
  expect(hires.every((row) => row.providerSubscriptionId === null)).toBe(true);
  expect(hires.map((row) => row.providerPaymentId).sort()).toEqual([
    "pay_first",
    "pay_second",
  ]);
  const [sharedProviderIdentity] = await sql<Array<{ count: number }>>`
    SELECT count(*)::int AS count FROM (
      SELECT provider, provider_subscription_id
      FROM billing_plan_hires
      WHERE tenant_id = ${tenantId} AND provider_subscription_id IS NOT NULL
      GROUP BY provider, provider_subscription_id
      HAVING count(DISTINCT store_id) > 1
    ) shared
  `;
  expect(sharedProviderIdentity?.count).toBe(0);

  const [counts] = await sql<
    Array<{ activeFree: number; activePaid: number; reconciliations: number }>
  >`
    SELECT
      count(*) FILTER (WHERE item.unit_amount_cents = 0 AND item.ends_at IS NULL)::int AS "activeFree",
      count(*) FILTER (WHERE item.unit_amount_cents > 0 AND item.ends_at > now())::int AS "activePaid",
      (SELECT count(*)::int FROM billing_provider_reconciliations WHERE tenant_id = ${tenantId} AND kind = 'catalog_migration') AS reconciliations
    FROM subscription_items item WHERE item.tenant_id = ${tenantId}
  `;
  expect(counts).toEqual({ activeFree: 2, activePaid: 0, reconciliations: 2 });
  const [invalidWindows] = await sql<Array<{ count: number }>>`
    SELECT count(*)::int AS count FROM subscription_items
    WHERE tenant_id = ${tenantId} AND ends_at IS NOT NULL
      AND ends_at <= starts_at
  `;
  expect(invalidWindows?.count).toBe(0);

  const scopedChildren = await sql<Array<{ matches: boolean }>>`
    SELECT child.store_id = subscription.store_id AS matches
    FROM (
      SELECT subscription_id, store_id, tenant_id FROM payments
      UNION ALL
      SELECT subscription_id, store_id, tenant_id FROM billing_checkout_sessions
    ) child
    JOIN subscriptions subscription
      ON subscription.id = child.subscription_id
     AND subscription.tenant_id = child.tenant_id
  `;
  expect(scopedChildren).toHaveLength(2);
  expect(scopedChildren.every((row) => row.matches)).toBe(true);

  const entitlements = await sql<Array<{ featureKey: string; status: string }>>`
    SELECT feature_key AS "featureKey", status
    FROM store_entitlements WHERE tenant_id = ${tenantId}
  `;
  expect(entitlements.filter((row) => row.featureKey === "storefront")).toEqual(
    [
      expect.objectContaining({ status: "active" }),
      expect.objectContaining({ status: "active" }),
    ],
  );
  expect(entitlements.filter((row) => row.featureKey === "finance")).toEqual([
    expect.objectContaining({ status: "inactive" }),
    expect.objectContaining({ status: "inactive" }),
  ]);
}

function readCatalogReconciliationState(
  sql: postgres.TransactionSql,
  tenantId: string,
) {
  return sql<
    Array<{
      attemptCount: number;
      availableAt: Date;
      completedAt: Date | null;
      lastError: string | null;
      processingStartedAt: Date | null;
      processingToken: string | null;
      status: string;
      storeId: string;
      updatedAt: Date;
    }>
  >`
    SELECT attempt_count AS "attemptCount", available_at AS "availableAt",
      completed_at AS "completedAt", last_error AS "lastError",
      processing_started_at AS "processingStartedAt",
      processing_token AS "processingToken", status, store_id AS "storeId",
      updated_at AS "updatedAt"
    FROM billing_provider_reconciliations
    WHERE tenant_id = ${tenantId} AND kind = 'catalog_migration'
    ORDER BY store_id
  `;
}
