import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres, { type TransactionSql } from "postgres";
import { beforeAll, describe, expect, it } from "vitest";

const runRawDb =
  process.env.RUN_RAW_BILLING_PLAN_HIRE_INTEGRITY_TESTS === "true";
const migrations = [
  "0069_production_billing_packaging_cutover.sql",
  "0070_billing_reconciliation_replay.sql",
  "0071_zapi_byok_credentials_cutover.sql",
  "0072_billing_product_event_outbox.sql",
  "0073_billing_lifecycle_monotonicity.sql",
  "0074_billing_product_event_delivery.sql",
  "0077_billing_product_event_requeue.sql",
  "0078_store_scoped_billing_subscriptions.sql",
].map((name) =>
  readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"),
);

type Fixture = {
  freePlanId: string;
  paidPlanId: string;
  primary: Scope;
  alternate: Scope;
  primarySubscriptionId: string;
  alternateSubscriptionId: string;
  primaryItemId: string;
  quoteId: string;
  alternateQuoteId: string;
  concurrentHireIds: string[];
};

type Scope = {
  tenantId: string;
  storeId: string;
  customerId: string;
};

describe.skipIf(!runRawDb)("billing plan hire integrity on Postgres", () => {
  beforeAll(async () => {
    const sql = openDatabase(1);
    try {
      const [overlapConstraint] = await sql<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'subscription_items_no_overlapping_store_plans'
        ) AS exists
      `;
      if (!overlapConstraint?.exists) {
        await sql.unsafe(migrations[0]!);
      }
      const [markers] = await sql<
        Array<{ prerequisitesComplete: boolean; storeScopeComplete: boolean }>
      >`
        SELECT
          EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'billing_provider_reconciliations_target_shape_check'
          ) AS "storeScopeComplete",
          (
            EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conname = 'crm_channel_connections_zapi_instance_redacted_check'
            ) AND EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = 'billing_plan_hires'
                AND column_name = 'effective_at'
            ) AND EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = 'billing_product_event_outbox'
                AND column_name = 'next_attempt_at'
            ) AND EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = 'billing_product_event_outbox'
                AND column_name = 'requeue_count'
            )
          ) AS "prerequisitesComplete"
      `;
      if (markers?.storeScopeComplete && !markers.prerequisitesComplete) {
        throw new Error(
          "Store-scoped billing marker exists without 0071-0077 prerequisites.",
        );
      }
      if (!markers?.storeScopeComplete) {
        await sql.unsafe(migrations[1]!);
        await sql.unsafe(migrations[2]!);
        await sql.unsafe(migrations[3]!);
        await sql.unsafe(migrations[4]!);
        await sql.unsafe(migrations[5]!);
        await sql.unsafe(migrations[6]!);
      }
      await sql.unsafe(migrations[7]!);
      await sql.unsafe("COMMIT");
    } finally {
      await sql.end();
    }
  });

  it("rejects cross-tenant/store hire relationships", async () => {
    const sql = openDatabase();
    const fixture = await createFixture(sql);

    try {
      await expect(
        sql.begin(async (transaction) => {
          await transaction.savepoint(async (savepoint) => {
            await insertHireRecord(savepoint, {
              idempotencyKey: `cross-scope-${randomUUID()}`,
              planId: fixture.paidPlanId,
              storeId: fixture.alternate.storeId,
              subscriptionId: fixture.alternateSubscriptionId,
              tenantId: fixture.primary.tenantId,
              effectiveSubscriptionItemId: fixture.primaryItemId,
              quoteId: fixture.quoteId,
            });
          });
        }),
      ).rejects.toMatchObject({ code: "23503" });

      await expect(
        sql.begin(async (transaction) => {
          await insertHireRecord(transaction, {
            idempotencyKey: `quote-scope-${randomUUID()}`,
            planId: fixture.paidPlanId,
            storeId: fixture.primary.storeId,
            subscriptionId: fixture.primarySubscriptionId,
            tenantId: fixture.primary.tenantId,
            quoteId: fixture.alternateQuoteId,
          });
        }),
      ).rejects.toMatchObject({ code: "23503" });
    } finally {
      await cleanup(sql, fixture);
      await sql.end();
    }
  });

  it("rejects overlapping effective plan windows and invalid plan row shapes", async () => {
    const sql = openDatabase();
    const fixture = await createFixture(sql);
    const firstItemId = randomUUID();
    const secondItemId = randomUUID();

    try {
      await sql.begin(async (transaction) => {
        await insertPlanItem(transaction, {
          id: firstItemId,
          planId: fixture.paidPlanId,
          startsAt: "2026-01-01T00:00:00Z",
          endsAt: "2026-02-01T00:00:00Z",
          storeId: fixture.alternate.storeId,
          subscriptionId: fixture.alternateSubscriptionId,
          tenantId: fixture.alternate.tenantId,
        });

        await expect(
          transaction.savepoint(async (savepoint) => {
            await insertPlanItem(savepoint, {
              id: secondItemId,
              planId: fixture.freePlanId,
              startsAt: "2026-01-15T00:00:00Z",
              endsAt: "2026-03-01T00:00:00Z",
              storeId: fixture.alternate.storeId,
              subscriptionId: fixture.alternateSubscriptionId,
              tenantId: fixture.alternate.tenantId,
            });
          }),
        ).rejects.toMatchObject({ code: "23P01" });

        await expect(
          transaction.savepoint(async (savepoint) => {
            await savepoint`
              INSERT INTO subscription_items (
                id, addon_id, item_type, plan_id, store_id, subscription_id,
                tenant_id, unit_amount_cents
              ) VALUES (
                ${randomUUID()}, NULL, 'addon', ${fixture.paidPlanId},
                ${fixture.alternate.storeId}, ${fixture.alternateSubscriptionId},
                ${fixture.alternate.tenantId}, 39700
              )
            `;
          }),
        ).rejects.toMatchObject({ code: "23514" });
      });
    } finally {
      await cleanup(sql, fixture, [firstItemId, secondItemId]);
      await sql.end();
    }
  });

  it("enforces idempotency and one open hire, including concurrent inserts", async () => {
    const sql = openDatabase();
    const fixture = await createFixture(sql);
    const firstHireId = randomUUID();
    const duplicateHireId = randomUUID();
    const openHireId = randomUUID();
    const concurrentA = randomUUID();
    const concurrentB = randomUUID();
    fixture.concurrentHireIds.push(
      firstHireId,
      duplicateHireId,
      openHireId,
      concurrentA,
      concurrentB,
    );

    try {
      await insertHire(sql, {
        id: firstHireId,
        idempotencyKey: "same-request",
        planId: fixture.paidPlanId,
        storeId: fixture.primary.storeId,
        subscriptionId: fixture.primarySubscriptionId,
        tenantId: fixture.primary.tenantId,
      });

      await expect(
        insertHire(sql, {
          id: duplicateHireId,
          idempotencyKey: "same-request",
          planId: fixture.paidPlanId,
          storeId: fixture.primary.storeId,
          subscriptionId: fixture.primarySubscriptionId,
          tenantId: fixture.primary.tenantId,
        }),
      ).rejects.toMatchObject({ code: "23505" });

      await expect(
        insertHire(sql, {
          id: openHireId,
          idempotencyKey: "different-request",
          planId: fixture.paidPlanId,
          storeId: fixture.primary.storeId,
          subscriptionId: fixture.primarySubscriptionId,
          tenantId: fixture.primary.tenantId,
        }),
      ).rejects.toMatchObject({ code: "23505" });

      await sql`
        UPDATE billing_plan_hires SET status = 'paid_active' WHERE id = ${firstHireId}
      `;
      await insertHire(sql, {
        id: openHireId,
        idempotencyKey: "different-request",
        planId: fixture.paidPlanId,
        storeId: fixture.primary.storeId,
        subscriptionId: fixture.primarySubscriptionId,
        tenantId: fixture.primary.tenantId,
      });

      const [firstConcurrent, secondConcurrent] = await Promise.allSettled([
        insertHire(sql, {
          id: concurrentA,
          idempotencyKey: "concurrent-a",
          planId: fixture.paidPlanId,
          storeId: fixture.alternate.storeId,
          subscriptionId: fixture.alternateSubscriptionId,
          tenantId: fixture.alternate.tenantId,
          delayMs: 50,
        }),
        insertHire(sql, {
          id: concurrentB,
          idempotencyKey: "concurrent-b",
          planId: fixture.paidPlanId,
          storeId: fixture.alternate.storeId,
          subscriptionId: fixture.alternateSubscriptionId,
          tenantId: fixture.alternate.tenantId,
          delayMs: 50,
        }),
      ]);

      expect([firstConcurrent.status, secondConcurrent.status].sort()).toEqual([
        "fulfilled",
        "rejected",
      ]);
      const rejected = [firstConcurrent, secondConcurrent].find(
        (result) => result.status === "rejected",
      );
      expect(rejected).toMatchObject({ reason: { code: "23505" } });
    } finally {
      await cleanup(sql, fixture);
      await sql.end();
    }
  });

  it("isolates provider recurrence state between stores in the same tenant", async () => {
    const sql = openDatabase();
    const tenantId = randomUUID();
    const customerId = randomUUID();
    const firstStoreId = randomUUID();
    const secondStoreId = randomUUID();
    const planId = randomUUID();
    const firstSubscriptionId = randomUUID();
    const secondSubscriptionId = randomUUID();

    try {
      await sql`
        INSERT INTO tenants (id, legal_name, slug, trading_name)
        VALUES (${tenantId}, 'Shared tenant', ${`shared-${tenantId}`}, 'Shared tenant')
      `;
      await sql`
        INSERT INTO stores (id, public_slug, tenant_id, trading_name)
        VALUES
          (${firstStoreId}, ${`first-${firstStoreId}`}, ${tenantId}, 'First store'),
          (${secondStoreId}, ${`second-${secondStoreId}`}, ${tenantId}, 'Second store')
      `;
      await sql`
        INSERT INTO billing_customers (id, name, provider, tenant_id)
        VALUES (${customerId}, 'Shared payer', 'asaas', ${tenantId})
      `;
      await sql`
        INSERT INTO plans (
          id, catalog_version, code, limits, monthly_price_cents, name, status
        ) VALUES (
          ${planId}, 'store-scope-test', ${`scope-${planId}`}, '{}', 0,
          'Store scope test', 'active'
        )
      `;
      await sql`
        INSERT INTO subscriptions (
          id, billing_customer_id, current_period_end, current_period_start,
          provider, provider_subscription_id, status, store_id, tenant_id
        ) VALUES
          (
            ${firstSubscriptionId}, ${customerId}, '2026-09-01', '2026-08-01',
            'asaas', 'asaas-first-store', 'active', ${firstStoreId}, ${tenantId}
          ),
          (
            ${secondSubscriptionId}, ${customerId}, '2026-09-15', '2026-08-15',
            'asaas', 'asaas-second-store', 'past_due', ${secondStoreId}, ${tenantId}
          )
      `;

      await sql`
        UPDATE subscriptions
        SET status = 'cancelled', current_period_end = '2026-08-31'
        WHERE id = ${firstSubscriptionId}
          AND tenant_id = ${tenantId}
          AND store_id = ${firstStoreId}
      `;
      const rows = await sql<
        Array<{
          currentPeriodEnd: Date | null;
          providerSubscriptionId: string | null;
          status: string;
          storeId: string;
        }>
      >`
        SELECT
          current_period_end AS "currentPeriodEnd",
          provider_subscription_id AS "providerSubscriptionId",
          status,
          store_id AS "storeId"
        FROM subscriptions
        WHERE tenant_id = ${tenantId}
        ORDER BY store_id
      `;

      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            providerSubscriptionId: "asaas-first-store",
            status: "cancelled",
            storeId: firstStoreId,
          }),
          expect.objectContaining({
            providerSubscriptionId: "asaas-second-store",
            status: "past_due",
            storeId: secondStoreId,
          }),
        ]),
      );
      await expect(
        sql`
          INSERT INTO subscription_items (
            item_type, plan_id, store_id, subscription_id, tenant_id,
            unit_amount_cents
          )
          VALUES (
            'plan', ${planId}, ${secondStoreId}, ${firstSubscriptionId},
            ${tenantId}, 0
          )
        `,
      ).rejects.toMatchObject({ code: "23503" });
    } finally {
      await sql`DELETE FROM subscriptions WHERE id IN (${firstSubscriptionId}, ${secondSubscriptionId})`;
      await sql`DELETE FROM billing_customers WHERE id = ${customerId}`;
      await sql`DELETE FROM plans WHERE id = ${planId}`;
      await sql`DELETE FROM stores WHERE id IN (${firstStoreId}, ${secondStoreId})`;
      await sql`DELETE FROM tenants WHERE id = ${tenantId}`;
      await sql.end();
    }
  });
});

function openDatabase(max = 4) {
  expect(
    process.env.DATABASE_URL,
    "DATABASE_URL is required for raw billing plan hire validation",
  ).toBeTruthy();
  return postgres(process.env.DATABASE_URL ?? "", { max, prepare: false });
}

async function createFixture(
  sql: ReturnType<typeof postgres>,
): Promise<Fixture> {
  const primary = await createScope(sql, "primary");
  const alternate = await createScope(sql, "alternate");
  const freePlanId = randomUUID();
  const paidPlanId = randomUUID();
  const primarySubscriptionId = randomUUID();
  const alternateSubscriptionId = randomUUID();
  const primaryItemId = randomUUID();
  const quoteId = randomUUID();
  const alternateQuoteId = randomUUID();

  await sql`
    INSERT INTO plans (
      id, catalog_version, code, is_default, limits, monthly_price_cents, name, status
    ) VALUES
      (${freePlanId}, '2026-08-v3', ${`free-${freePlanId}`}, true, '{}', 0, 'Free', 'active'),
      (${paidPlanId}, '2026-08-v3', ${`essencial-${paidPlanId}`}, false, '{}', 19700, 'Essencial', 'active')
  `;
  await insertSubscription(sql, {
    id: primarySubscriptionId,
    scope: primary,
  });
  await insertSubscription(sql, {
    id: alternateSubscriptionId,
    scope: alternate,
  });
  await insertPlanItem(sql, {
    id: primaryItemId,
    planId: freePlanId,
    storeId: primary.storeId,
    subscriptionId: primarySubscriptionId,
    tenantId: primary.tenantId,
  });
  await sql`
    INSERT INTO billing_plan_quotes (
      id, catalog_version, plan_id, requested_by_actor_id, status, store_id, tenant_id
    ) VALUES
      (
      ${quoteId}, '2026-08-v3', ${paidPlanId}, 'billing-integrity-test', 'requested',
      ${primary.storeId}, ${primary.tenantId}
      ),
      (
      ${alternateQuoteId}, '2026-08-v3', ${paidPlanId}, 'billing-integrity-test', 'requested',
      ${alternate.storeId}, ${alternate.tenantId}
      )
  `;

  return {
    alternate,
    alternateSubscriptionId,
    concurrentHireIds: [],
    freePlanId,
    paidPlanId,
    primary,
    primaryItemId,
    primarySubscriptionId,
    quoteId,
    alternateQuoteId,
  };
}

async function createScope(
  sql: ReturnType<typeof postgres>,
  label: string,
): Promise<Scope> {
  const tenantId = randomUUID();
  const storeId = randomUUID();
  const customerId = randomUUID();
  await sql`
    INSERT INTO tenants (id, legal_name, slug, trading_name)
    VALUES (${tenantId}, ${`Billing ${label} ${tenantId}`}, ${`billing-${label}-${tenantId}`}, ${`Billing ${label}`})
  `;
  await sql`
    INSERT INTO stores (id, public_slug, tenant_id, trading_name)
    VALUES (${storeId}, ${`billing-${label}-${storeId}`}, ${tenantId}, ${`Billing ${label}`})
  `;
  await sql`
    INSERT INTO billing_customers (id, name, provider_customer_id, tenant_id)
    VALUES (${customerId}, ${`Billing ${label}`}, NULL, ${tenantId})
  `;
  return { customerId, storeId, tenantId };
}

async function insertSubscription(
  sql: ReturnType<typeof postgres> | TransactionSql,
  input: { id: string; scope: Scope },
) {
  await sql`
    INSERT INTO subscriptions (
      id, billing_customer_id, status, store_id, tenant_id
    ) VALUES (
      ${input.id}, ${input.scope.customerId}, 'active',
      ${input.scope.storeId}, ${input.scope.tenantId}
    )
  `;
}

async function insertPlanItem(
  sql: ReturnType<typeof postgres> | TransactionSql,
  input: {
    id: string;
    planId: string;
    storeId: string;
    subscriptionId: string;
    tenantId: string;
    startsAt?: string;
    endsAt?: string;
  },
) {
  await sql`
    INSERT INTO subscription_items (
      id, item_type, plan_id, starts_at, ends_at, store_id, subscription_id,
      tenant_id, unit_amount_cents
    ) VALUES (
      ${input.id}, 'plan', ${input.planId}, ${input.startsAt ?? null},
      ${input.endsAt ?? null}, ${input.storeId}, ${input.subscriptionId},
      ${input.tenantId}, 19700
    )
  `;
}

async function insertHire(
  sql: ReturnType<typeof postgres>,
  input: {
    id?: string;
    idempotencyKey: string;
    planId: string;
    storeId: string;
    subscriptionId: string;
    tenantId: string;
    effectiveSubscriptionItemId?: string;
    quoteId?: string;
    delayMs?: number;
  },
) {
  return sql.begin(async (transaction) => {
    await insertHireRecord(transaction, input);
    if (input.delayMs) {
      await transaction`SELECT pg_sleep(${input.delayMs / 1000})`;
    }
  });
}

async function insertHireRecord(
  transaction: TransactionSql,
  input: {
    id?: string;
    idempotencyKey: string;
    planId: string;
    storeId: string;
    subscriptionId: string;
    tenantId: string;
    effectiveSubscriptionItemId?: string;
    quoteId?: string;
  },
) {
  await transaction`
      INSERT INTO billing_plan_hires (
        id, catalog_version, checkout_mode, effective_subscription_item_id,
        idempotency_key, plan_id, plan_snapshot, quoted_cents, quote_id,
        status, store_id, subscription_id, tenant_id
      ) VALUES (
        ${input.id ?? randomUUID()}, '2026-08-v3',
        ${input.quoteId ? "quote_required" : "checkout"},
        ${input.effectiveSubscriptionItemId ?? null}, ${input.idempotencyKey},
        ${input.planId}, '{"code":"essencial"}', 19700,
        ${input.quoteId ?? null}, 'created', ${input.storeId},
        ${input.subscriptionId}, ${input.tenantId}
      )
    `;
}

async function cleanup(
  sql: ReturnType<typeof postgres>,
  fixture: Fixture,
  itemIds: string[] = [],
) {
  const hireIds = fixture.concurrentHireIds;
  await sql.begin(async (transaction) => {
    await transaction`DELETE FROM billing_plan_hire_transitions WHERE hire_id = ANY(${sql.array(hireIds)}::uuid[])`;
    await transaction`DELETE FROM billing_plan_hires WHERE id = ANY(${sql.array(hireIds)}::uuid[])`;
    await transaction`DELETE FROM billing_plan_quotes WHERE id IN (${fixture.quoteId}, ${fixture.alternateQuoteId})`;
    await transaction`DELETE FROM subscription_items WHERE id = ANY(${sql.array([...itemIds, fixture.primaryItemId])}::uuid[])`;
    await transaction`DELETE FROM subscriptions WHERE id IN (${fixture.primarySubscriptionId}, ${fixture.alternateSubscriptionId})`;
    await transaction`DELETE FROM billing_customers WHERE id IN (${fixture.primary.customerId}, ${fixture.alternate.customerId})`;
    await transaction`DELETE FROM plans WHERE id IN (${fixture.freePlanId}, ${fixture.paidPlanId})`;
    await transaction`DELETE FROM stores WHERE id IN (${fixture.primary.storeId}, ${fixture.alternate.storeId})`;
    await transaction`DELETE FROM tenants WHERE id IN (${fixture.primary.tenantId}, ${fixture.alternate.tenantId})`;
  });
}
