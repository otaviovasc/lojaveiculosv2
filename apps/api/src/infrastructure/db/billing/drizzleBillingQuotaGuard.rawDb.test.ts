import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { BillingQuotaExceededError } from "../../../domains/billing/ports/billingQuotaGuard.js";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleBillingQuotaGuard } from "./drizzleBillingQuotaGuard.js";

loadLocalEnv();

const runRawDb = process.env.RUN_RAW_BILLING_QUOTA_TESTS === "true";

describe.skipIf(!runRawDb)("atomic monthly billing quota on Postgres", () => {
  it("serializes concurrent provider reservations and rolls over at UTC month start", async () => {
    expect(
      process.env.DATABASE_URL,
      "DATABASE_URL is required for raw billing quota validation",
    ).toBeTruthy();
    const sqlClient = postgres(process.env.DATABASE_URL ?? "", {
      max: 4,
      prepare: false,
    });
    const fixture = createFixtureIds();

    try {
      await seedFixture(sqlClient, fixture);
      const db = drizzle(sqlClient, { schema });
      let checkedAt = new Date("2026-08-31T23:59:59.999Z");
      const guard = createDrizzleBillingQuotaGuard(db, () => checkedAt);
      expect(guard.reserveUsage).toBeDefined();
      expect(guard.markUsageStarted).toBeDefined();
      expect(guard.finalizeUsage).toBeDefined();
      if (
        !guard.reserveUsage ||
        !guard.markUsageStarted ||
        !guard.finalizeUsage
      ) {
        throw new Error("Durable billing quota methods are unavailable.");
      }

      const concurrent = await Promise.allSettled([
        guard.reserveUsage({
          provider: "apibrasil",
          quotaKey: "plate_lookup",
          requestId: "concurrent-plate-a",
          storeId: fixture.storeId,
          tenantId: fixture.tenantId,
        }),
        guard.reserveUsage({
          provider: "apibrasil",
          quotaKey: "plate_lookup",
          requestId: "concurrent-plate-b",
          storeId: fixture.storeId,
          tenantId: fixture.tenantId,
        }),
      ]);

      expect(concurrent.map(({ status }) => status).sort()).toEqual([
        "fulfilled",
        "rejected",
      ]);
      const rejected = concurrent.find(({ status }) => status === "rejected");
      expect(rejected?.status).toBe("rejected");
      if (rejected?.status === "rejected") {
        expect(rejected.reason).toBeInstanceOf(BillingQuotaExceededError);
      }
      const fulfilled = concurrent.find(({ status }) => status === "fulfilled");
      if (!fulfilled || fulfilled.status !== "fulfilled") {
        throw new Error("Expected one quota reservation to succeed.");
      }

      await guard.markUsageStarted({
        reservationId: fulfilled.value.reservationId,
        storeId: fixture.storeId,
        tenantId: fixture.tenantId,
      });
      await guard.finalizeUsage({
        failureCode: "ProviderUnavailableError",
        outcome: "provider_failed",
        reservationId: fulfilled.value.reservationId,
        storeId: fixture.storeId,
        tenantId: fixture.tenantId,
      });
      await expect(
        guard.reserveUsage({
          provider: "apibrasil",
          quotaKey: "plate_lookup",
          requestId: "same-month-after-failure",
          storeId: fixture.storeId,
          tenantId: fixture.tenantId,
        }),
      ).rejects.toBeInstanceOf(BillingQuotaExceededError);
      await expect(
        guard.getAllowance?.({
          quotaKey: "plate_lookup",
          storeId: fixture.storeId,
          tenantId: fixture.tenantId,
        }),
      ).resolves.toEqual({ limit: 1, remaining: 0, used: 1 });

      checkedAt = new Date("2026-09-01T00:00:00.000Z");
      await expect(
        guard.getAllowance?.({
          quotaKey: "plate_lookup",
          storeId: fixture.storeId,
          tenantId: fixture.tenantId,
        }),
      ).resolves.toEqual({ limit: 1, remaining: 1, used: 0 });
      const nextMonth = await guard.reserveUsage({
        provider: "apibrasil",
        quotaKey: "plate_lookup",
        requestId: "next-month",
        storeId: fixture.storeId,
        tenantId: fixture.tenantId,
      });
      await guard.finalizeUsage({
        outcome: "released",
        reservationId: nextMonth.reservationId,
        storeId: fixture.storeId,
        tenantId: fixture.tenantId,
      });
      await expect(
        guard.getAllowance?.({
          quotaKey: "plate_lookup",
          storeId: fixture.storeId,
          tenantId: fixture.tenantId,
        }),
      ).resolves.toEqual({ limit: 1, remaining: 1, used: 0 });
    } finally {
      await cleanupFixture(sqlClient, fixture);
      await sqlClient.end();
    }
  });
});

function createFixtureIds() {
  return {
    billingCustomerId: randomUUID(),
    planId: randomUUID(),
    storeId: randomUUID(),
    subscriptionId: randomUUID(),
    subscriptionItemId: randomUUID(),
    tenantId: randomUUID(),
  };
}

async function seedFixture(
  sql: ReturnType<typeof postgres>,
  fixture: ReturnType<typeof createFixtureIds>,
) {
  const suffix = fixture.tenantId.slice(0, 8);
  await sql`
    INSERT INTO tenants (id, legal_name, slug, trading_name)
    VALUES (${fixture.tenantId}, 'Quota test tenant', ${`quota-${suffix}`}, 'Quota test')
  `;
  await sql`
    INSERT INTO stores (id, public_slug, tenant_id, trading_name)
    VALUES (${fixture.storeId}, ${`quota-store-${suffix}`}, ${fixture.tenantId}, 'Quota store')
  `;
  await sql`
    INSERT INTO billing_customers (id, name, provider, tenant_id)
    VALUES (${fixture.billingCustomerId}, 'Quota billing customer', 'asaas', ${fixture.tenantId})
  `;
  await sql`
    INSERT INTO plans (
      id, catalog_version, code, limits, monthly_price_cents, name, published_at, status
    ) VALUES (
      ${fixture.planId}, ${`quota-test-${suffix}`}, ${`quota-${suffix}`},
      ${sql.json({ seller_limit: 1, vehicle_limit: 1 })}, 0,
      'Quota test plan', '2026-01-01T00:00:00Z', 'active'
    )
  `;
  await sql`
    INSERT INTO plan_features (
      feature_key, included, included_in_trial, limit_value, plan_id
    ) VALUES ('plate_lookup', 1, false, 1, ${fixture.planId})
  `;
  await sql`
    INSERT INTO subscriptions (
      id, billing_customer_id, provider, status, tenant_id
    ) VALUES (
      ${fixture.subscriptionId}, ${fixture.billingCustomerId}, 'asaas', 'active', ${fixture.tenantId}
    )
  `;
  await sql`
    INSERT INTO subscription_items (
      id, item_type, plan_id, quantity, starts_at, store_id,
      subscription_id, tenant_id, unit_amount_cents
    ) VALUES (
      ${fixture.subscriptionItemId}, 'plan', ${fixture.planId}, 1,
      '2026-01-01T00:00:00Z', ${fixture.storeId}, ${fixture.subscriptionId},
      ${fixture.tenantId}, 0
    )
  `;
}

async function cleanupFixture(
  sql: ReturnType<typeof postgres>,
  fixture: ReturnType<typeof createFixtureIds>,
) {
  await sql`
    DELETE FROM billing_quota_usage_reservations
    WHERE tenant_id = ${fixture.tenantId}
  `;
  await sql`DELETE FROM subscription_items WHERE id = ${fixture.subscriptionItemId}`;
  await sql`DELETE FROM subscriptions WHERE id = ${fixture.subscriptionId}`;
  await sql`DELETE FROM plan_features WHERE plan_id = ${fixture.planId}`;
  await sql`DELETE FROM plans WHERE id = ${fixture.planId}`;
  await sql`DELETE FROM billing_customers WHERE id = ${fixture.billingCustomerId}`;
  await sql`DELETE FROM stores WHERE id = ${fixture.storeId}`;
  await sql`DELETE FROM tenants WHERE id = ${fixture.tenantId}`;
}
