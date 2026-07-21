#!/usr/bin/env node
// One-off backfill: creates billing_customers and trialing subscriptions for
// tenants that have stores but no billing account rows. This covers stores
// migrated from V1 before the migration seeded billing rows, which made
// PUT /api/v1/billing/selection return 500 and checkout fail with
// missing_billing_account.
//
// The script is idempotent: existing rows are never modified and re-runs
// insert nothing. New subscriptions mirror the onboarding defaults
// (asaas provider, trialing status, 14-day trial period).
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
  console.log(
    `Tenants missing billing_customers: ${missingCustomers.length}; missing subscriptions: ${missingSubscriptions.length}.`,
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
          null, null, ${tenant.legal_name}, 'asaas',
          ${`local_asaas_customer_${tenant.id}`}, ${tenant.id}
        )
        ON CONFLICT (tenant_id, provider) DO NOTHING
      `;
    }
    for (const tenant of missingSubscriptions) {
      await tx`
        INSERT INTO subscriptions
          (billing_customer_id, current_period_end, current_period_start, provider, provider_subscription_id, status, tenant_id)
        SELECT bc.id, now() + interval '14 days', now(), 'asaas',
          ${`local_asaas_subscription_${tenant.id}`}, 'trialing', ${tenant.id}
        FROM billing_customers bc
        WHERE bc.tenant_id = ${tenant.id} AND bc.provider = 'asaas'
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions sub WHERE sub.tenant_id = ${tenant.id}
          )
      `;
    }
  });
  console.log(
    `Backfill applied: ${missingCustomers.length} billing customer(s), up to ${missingSubscriptions.length} subscription(s).`,
  );
} finally {
  await sql.end();
}
