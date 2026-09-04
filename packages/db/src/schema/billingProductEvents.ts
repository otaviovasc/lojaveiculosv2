import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { billingPlanHires } from "./billing.js";
import { stores, tenants } from "./identity.js";

export const billingProductEventNames = [
  "hire_created",
  "checkout_created",
  "payment_observed",
  "provider_bound",
  "contract_activated",
  "grace_entered",
  "free_fallback",
  "reconciliation_failed",
] as const;

export type BillingProductEventName = (typeof billingProductEventNames)[number];

export const billingProductEventName = pgEnum(
  "billing_product_event_name",
  billingProductEventNames,
);

export const billingProductEventOutboxStatus = pgEnum(
  "billing_product_event_outbox_status",
  ["pending", "processed", "failed"],
);

export const billingProductEventOutbox = pgTable(
  "billing_product_event_outbox",
  {
    ...lifecycleColumns,
    attemptCount: integer("attempt_count").notNull().default(0),
    eventName: billingProductEventName("event_name").notNull(),
    failureCode: varchar("failure_code", { length: 120 }),
    hireId: uuid("hire_id").references(() => billingPlanHires.id),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    leaseToken: varchar("lease_token", { length: 191 }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    properties: jsonb("properties").notNull().default({}),
    providerCheckoutId: varchar("provider_checkout_id", { length: 191 }),
    providerEventId: varchar("provider_event_id", { length: 191 }),
    providerPaymentId: varchar("provider_payment_id", { length: 191 }),
    providerSubscriptionId: varchar("provider_subscription_id", {
      length: 191,
    }),
    requeueCount: integer("requeue_count").notNull().default(0),
    requestId: varchar("request_id", { length: 191 }),
    status: billingProductEventOutboxStatus("status")
      .notNull()
      .default("pending"),
    storeId: uuid("store_id").references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "billing_product_event_outbox_store_tenant_fk",
    }),
    foreignKey({
      columns: [table.hireId, table.tenantId, table.storeId],
      foreignColumns: [
        billingPlanHires.id,
        billingPlanHires.tenantId,
        billingPlanHires.storeId,
      ],
      name: "billing_product_event_outbox_hire_scope_fk",
    }),
    check(
      "billing_product_event_outbox_hire_store_check",
      sql`${table.hireId} IS NULL OR ${table.storeId} IS NOT NULL`,
    ),
    check(
      "billing_product_event_outbox_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "billing_product_event_outbox_requeue_count_check",
      sql`${table.requeueCount} >= 0`,
    ),
    check(
      "billing_product_event_outbox_lease_pair_check",
      sql`(${table.leaseToken} IS NULL) = (${table.leaseExpiresAt} IS NULL)`,
    ),
    check(
      "billing_product_event_outbox_properties_check",
      sql`jsonb_typeof(${table.properties}) = 'object' AND octet_length(${table.properties}::text) <= 4096`,
    ),
    uniqueIndex("billing_product_event_outbox_idempotency_unique").on(
      table.idempotencyKey,
    ),
    index("billing_product_event_outbox_delivery_idx").on(
      table.status,
      table.nextAttemptAt,
      table.leaseExpiresAt,
    ),
    index("billing_product_event_outbox_scope_occurred_idx").on(
      table.tenantId,
      table.storeId,
      table.occurredAt,
    ),
  ],
);
