import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { stores, tenants } from "./identity.js";
import { scopedStoreForeignKey } from "./crmCore/scoped.js";

export const crmRetentionLegalHolds = pgTable(
  "crm_retention_legal_holds",
  {
    ...lifecycleColumns,
    category: varchar("category", { length: 40 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    reason: text("reason").notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    resourceId: uuid("resource_id"),
    resourceType: varchar("resource_type", { length: 80 }),
    startsAt: timestamp("starts_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_retention_legal_holds_store_tenant_fk"),
    check(
      "crm_retention_legal_holds_category_check",
      sql`${table.category} is null or ${table.category} in ('canonical_message', 'provider_raw_payload', 'bot_interaction')`,
    ),
    check(
      "crm_retention_legal_holds_expiry_check",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.startsAt}`,
    ),
    check(
      "crm_retention_legal_holds_target_check",
      sql`(${table.resourceId} is null) = (${table.resourceType} is null)`,
    ),
    check(
      "crm_retention_legal_holds_reason_nonempty",
      sql`btrim(${table.reason}) <> ''`,
    ),
    index("crm_retention_legal_holds_active_scope_idx").on(
      table.tenantId,
      table.storeId,
      table.releasedAt,
      table.expiresAt,
    ),
  ],
);

export const crmRetentionScopes = pgTable(
  "crm_retention_scopes",
  {
    ...lifecycleColumns,
    cursor: text("cursor"),
    lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
    lastFailedAt: timestamp("last_failed_at", { withTimezone: true }),
    lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    leaseOwner: varchar("lease_owner", { length: 191 }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_retention_scopes_store_tenant_fk"),
    check(
      "crm_retention_scopes_lease_pair_check",
      sql`(${table.leaseOwner} is null) = (${table.leaseExpiresAt} is null)`,
    ),
    uniqueIndex("crm_retention_scopes_scope_unique").on(
      table.tenantId,
      table.storeId,
    ),
    index("crm_retention_scopes_claim_idx").on(
      table.nextRunAt,
      table.leaseExpiresAt,
    ),
  ],
);

export const crmRetentionAuditOutbox = pgTable(
  "crm_retention_audit_outbox",
  {
    ...lifecycleColumns,
    actorId: varchar("actor_id", { length: 191 }).notNull(),
    actorKind: varchar("actor_kind", { length: 24 }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    auditId: uuid("audit_id").notNull().defaultRandom(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    leaseOwner: varchar("lease_owner", { length: 191 }),
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
    scopedStoreForeignKey(table, "crm_retention_audit_outbox_store_tenant_fk"),
    check(
      "crm_retention_audit_outbox_actor_kind_check",
      sql`${table.actorKind} in ('integration', 'public', 'system', 'user')`,
    ),
    check(
      "crm_retention_audit_outbox_state_check",
      sql`${table.state} in ('pending', 'delivering', 'delivered', 'dead_letter')`,
    ),
    check(
      "crm_retention_audit_outbox_attempt_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "crm_retention_audit_outbox_lease_pair_check",
      sql`(${table.leaseOwner} is null) = (${table.leaseExpiresAt} is null)`,
    ),
    uniqueIndex("crm_retention_audit_outbox_idempotency_unique").on(
      table.idempotencyKey,
    ),
    uniqueIndex("crm_retention_audit_outbox_audit_id_unique").on(table.auditId),
    index("crm_retention_audit_outbox_claim_idx").on(
      table.state,
      table.nextAttemptAt,
      table.leaseExpiresAt,
    ),
  ],
);
