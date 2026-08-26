import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { billingQuotaUsageReservations } from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0076_atomic_monthly_plate_lookup_quota.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("billing quota usage reservation schema", () => {
  it("stores append-only monthly provider-call reservations separately from cache", () => {
    const config = getTableConfig(billingQuotaUsageReservations);

    expect(config.name).toBe("billing_quota_usage_reservations");
    expect(config.columns.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "failure_code",
        "finalized_at",
        "period_start",
        "provider",
        "provider_call_started_at",
        "quota_key",
        "request_id",
        "status",
        "store_id",
        "tenant_id",
      ]),
    );
    expect(
      config.foreignKeys.map((foreignKey) => foreignKey.getName()),
    ).toContain("billing_quota_usage_reservations_store_tenant_fk");
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "billing_quota_usage_reservations_finalization_check",
        "billing_quota_usage_reservations_key_check",
        "billing_quota_usage_reservations_period_check",
        "billing_quota_usage_reservations_provider_start_check",
      ]),
    );
  });

  it("migrates the UTC-month and scoped reservation invariants", () => {
    expect(migration).toContain(
      'create table "billing_quota_usage_reservations"',
    );
    expect(migration).toContain(
      'constraint "billing_quota_usage_reservations_store_tenant_fk"',
    );
    expect(migration).toContain("date_trunc('month'");
    expect(migration).toContain("'provider_failed'");
    expect(migration).toContain("'released'");
  });
});
