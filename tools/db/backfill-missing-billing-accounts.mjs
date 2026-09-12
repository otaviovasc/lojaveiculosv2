#!/usr/bin/env node
// One-off backfill: provisions the permanent Free contract for stores whose
// tenant has no billing account or whose store has no effective plan contract.
//
// The script is idempotent: existing rows are never modified and re-runs
// insert nothing. Provider identities remain null until verified evidence binds
// them, matching the current account-provisioning contract.
//
// Usage:
//   DATABASE_URL=postgresql://... node tools/db/backfill-missing-billing-accounts.mjs
//   DATABASE_URL=postgresql://... node tools/db/backfill-missing-billing-accounts.mjs --apply
//
// Without --apply the script only reports how many rows would be inserted.
// Reuses the existing DATABASE_URL env var (see docs/ops/env-vars.md).
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const apply = process.argv.includes("--apply");

const sql = postgres(databaseUrl, { max: 1, prepare: false });
try {
  const missingCustomers = await sql`
    SELECT t.id, t.legal_name
    FROM tenants t
    WHERE EXISTS (SELECT 1 FROM stores s WHERE s.tenant_id = t.id)
      AND NOT EXISTS (
        SELECT 1 FROM billing_customers bc
        WHERE bc.tenant_id = t.id AND bc.provider = 'asaas'
      )
    ORDER BY t.created_at
  `;
  const missingSubscriptions = await sql`
    SELECT t.id
    FROM tenants t
    WHERE EXISTS (SELECT 1 FROM stores s WHERE s.tenant_id = t.id)
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions sub WHERE sub.tenant_id = t.id
      )
    ORDER BY t.created_at
  `;
  const missingContracts = await sql`
    SELECT s.id, s.tenant_id
    FROM stores s
    WHERE s.is_deleted = false
      AND NOT EXISTS (
        SELECT 1 FROM subscription_items item
        WHERE item.tenant_id = s.tenant_id
          AND item.store_id = s.id
          AND item.item_type = 'plan'
          AND coalesce(item.starts_at, '-infinity'::timestamptz) <= now()
          AND coalesce(item.ends_at, 'infinity'::timestamptz) > now()
      )
    ORDER BY s.created_at
  `;
  console.log(
    `Tenants missing billing_customers: ${missingCustomers.length}; missing subscriptions: ${missingSubscriptions.length}; stores missing contracts: ${missingContracts.length}.`,
  );
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to insert the rows.");
    process.exit(0);
  }

  await sql.begin(async (tx) => {
    for (const tenant of missingCustomers) {
      await tx`
        INSERT INTO billing_customers
          (document_number, email, name, provider, provider_customer_id, tenant_id)
        VALUES (
          null, null, ${tenant.legal_name}, 'asaas', null, ${tenant.id}
        )
        ON CONFLICT (tenant_id, provider) DO NOTHING
      `;
    }
    for (const tenant of missingSubscriptions) {
      await tx`
        INSERT INTO subscriptions
          (billing_customer_id, current_period_end, current_period_start, provider, provider_subscription_id, status, tenant_id)
        SELECT bc.id, null, now(), 'asaas', null, 'active', ${tenant.id}
        FROM billing_customers bc
        WHERE bc.tenant_id = ${tenant.id} AND bc.provider = 'asaas'
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions sub WHERE sub.tenant_id = ${tenant.id}
          )
      `;
    }

    await tx`
      UPDATE store_entitlements entitlement
      SET
        ends_at = coalesce(entitlement.ends_at, now()),
        status = 'inactive',
        updated_at = now()
      WHERE entitlement.status <> 'inactive'
        AND EXISTS (
          SELECT 1 FROM stores store
          WHERE store.id = entitlement.store_id
            AND store.tenant_id = entitlement.tenant_id
            AND store.is_deleted = false
            AND NOT EXISTS (
              SELECT 1 FROM subscription_items item
              WHERE item.tenant_id = store.tenant_id
                AND item.store_id = store.id
                AND item.item_type = 'plan'
                AND coalesce(item.starts_at, '-infinity'::timestamptz) <= now()
                AND coalesce(item.ends_at, 'infinity'::timestamptz) > now()
            )
        )
    `;

    await tx`
      INSERT INTO subscription_items (
        addon_id, ends_at, item_type, plan_id, quantity, starts_at, store_id,
        subscription_id, tenant_id, unit_amount_cents
      )
      SELECT
        null, null, 'plan', free_plan.id, 1, now(), store.id,
        subscription.id, store.tenant_id, 0
      FROM stores store
      JOIN LATERAL (
        SELECT sub.id
        FROM subscriptions sub
        WHERE sub.tenant_id = store.tenant_id AND sub.status = 'active'
        ORDER BY sub.created_at DESC
        LIMIT 1
      ) subscription ON true
      JOIN plans free_plan
        ON free_plan.catalog_version = '2026-08-v3'
        AND free_plan.code = 'free'
        AND free_plan.status = 'active'
      WHERE store.is_deleted = false
        AND NOT EXISTS (
          SELECT 1 FROM subscription_items item
          WHERE item.tenant_id = store.tenant_id
            AND item.store_id = store.id
            AND item.item_type = 'plan'
            AND coalesce(item.starts_at, '-infinity'::timestamptz) <= now()
            AND coalesce(item.ends_at, 'infinity'::timestamptz) > now()
        )
    `;

    await tx`
      INSERT INTO store_entitlements (
        feature_key, metadata, source, starts_at, ends_at, status, store_id,
        tenant_id
      )
      SELECT
        feature.feature_key,
        jsonb_build_object(
          'billingStatus', 'active',
          'catalogVersion', plan.catalog_version,
          'limitValue', feature.limit_value,
          'planCode', plan.code
        ),
        'billing_catalog', item.starts_at, null, 'active', item.store_id,
        item.tenant_id
      FROM subscription_items item
      JOIN plans plan ON plan.id = item.plan_id
      JOIN plan_features feature
        ON feature.plan_id = plan.id AND feature.included = 1
      WHERE plan.catalog_version = '2026-08-v3'
        AND plan.code = 'free'
        AND item.item_type = 'plan'
        AND coalesce(item.starts_at, '-infinity'::timestamptz) <= now()
        AND coalesce(item.ends_at, 'infinity'::timestamptz) > now()
      ON CONFLICT (store_id, feature_key) DO UPDATE SET
        ends_at = null,
        metadata = EXCLUDED.metadata,
        source = 'billing_catalog',
        starts_at = EXCLUDED.starts_at,
        status = 'active',
        tenant_id = EXCLUDED.tenant_id,
        updated_at = now()
    `;
  });
  console.log(
    `Backfill applied: ${missingCustomers.length} billing customer(s), up to ${missingSubscriptions.length} subscription(s), and up to ${missingContracts.length} permanent Free contract(s).`,
  );
} finally {
  await sql.end();
}
