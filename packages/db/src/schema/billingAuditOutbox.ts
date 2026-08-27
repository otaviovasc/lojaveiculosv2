import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants } from "./identity.js";

export const billingAuditOutbox = pgTable(
  "billing_audit_outbox",
  {
    ...lifecycleColumns,
    action: varchar("action", { length: 120 }).notNull(),
    actorId: varchar("actor_id", { length: 191 }).notNull(),
    actorKind: varchar("actor_kind", { length: 24 }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    auditId: uuid("audit_id").notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    entityId: uuid("entity_id").notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    failureCode: varchar("failure_code", { length: 120 }),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    leaseToken: varchar("lease_token", { length: 191 }),
    metadata: jsonb("metadata").notNull().default({}),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    requestId: varchar("request_id", { length: 191 }).notNull(),
    state: varchar("state", { length: 24 }).notNull().default("pending"),
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
      name: "billing_audit_outbox_store_tenant_fk",
    }),
    check(
      "billing_audit_outbox_action_check",
      sql`${table.action} in ('billing.plan_hire.activated', 'billing.plan_hire.created', 'billing.plan_hire.checkout_created', 'billing.plan_quote.approved', 'billing.plan_quote.requested', 'billing.subscription.free_fallback')`,
    ),
    check(
      "billing_audit_outbox_actor_kind_check",
      sql`${table.actorKind} in ('integration', 'public', 'system', 'user')`,
    ),
    check(
      "billing_audit_outbox_state_check",
      sql`${table.state} in ('pending', 'delivering', 'delivered', 'dead_letter')`,
    ),
    check(
      "billing_audit_outbox_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "billing_audit_outbox_lease_pair_check",
      sql`(${table.leaseToken} is null) = (${table.leaseExpiresAt} is null)`,
    ),
    check(
      "billing_audit_outbox_metadata_check",
      sql`jsonb_typeof(${table.metadata}) = 'object' and octet_length(${table.metadata}::text) <= 2048`,
    ),
    uniqueIndex("billing_audit_outbox_audit_id_unique").on(table.auditId),
    uniqueIndex("billing_audit_outbox_idempotency_unique").on(
      table.idempotencyKey,
    ),
    index("billing_audit_outbox_claim_idx").on(
      table.state,
      table.nextAttemptAt,
      table.leaseExpiresAt,
    ),
  ],
);
