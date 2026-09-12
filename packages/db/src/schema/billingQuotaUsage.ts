import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants } from "./identity.js";

export const billingQuotaUsageReservationStatus = pgEnum(
  "billing_quota_usage_reservation_status",
  ["reserved", "succeeded", "provider_failed", "released"],
);

/**
 * Durable quota reservations are deliberately separate from the plate cache.
 * A cache row is mutable and unique per plate, while quota usage is an
 * append-only record of every provider call attempted in a UTC billing month.
 */
export const billingQuotaUsageReservations = pgTable(
  "billing_quota_usage_reservations",
  {
    ...lifecycleColumns,
    failureCode: varchar("failure_code", { length: 120 }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerCallStartedAt: timestamp("provider_call_started_at", {
      withTimezone: true,
    }),
    quotaKey: varchar("quota_key", { length: 80 }).notNull(),
    requestId: varchar("request_id", { length: 191 }),
    status: billingQuotaUsageReservationStatus("status")
      .notNull()
      .default("reserved"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "billing_quota_usage_reservations_store_tenant_fk",
    }),
    check(
      "billing_quota_usage_reservations_key_check",
      sql`${table.quotaKey} = 'plate_lookup'`,
    ),
    check(
      "billing_quota_usage_reservations_period_check",
      sql`${table.periodStart} = date_trunc('month', ${table.periodStart} AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
    ),
    check(
      "billing_quota_usage_reservations_finalization_check",
      sql`(${table.status} = 'reserved' AND ${table.finalizedAt} IS NULL) OR (${table.status} <> 'reserved' AND ${table.finalizedAt} IS NOT NULL)`,
    ),
    check(
      "billing_quota_usage_reservations_provider_start_check",
      sql`${table.status} = 'reserved' OR (${table.status} = 'released' AND ${table.providerCallStartedAt} IS NULL) OR (${table.status} IN ('succeeded', 'provider_failed') AND ${table.providerCallStartedAt} IS NOT NULL)`,
    ),
    index("billing_quota_usage_reservations_scope_period_idx").on(
      table.tenantId,
      table.storeId,
      table.quotaKey,
      table.periodStart,
      table.status,
    ),
  ],
);
