import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { storeMemberships, stores, tenants, users } from "../identity.js";
import { conversationCycles, conversationThreads } from "./conversations.js";
import { crmMessages } from "./messages.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const crmPushSubscriptions = pgTable(
  "crm_push_subscriptions",
  {
    ...lifecycleColumns,
    enabled: boolean("enabled").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    subscriptionId: varchar("subscription_id", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    uniqueIndex("crm_push_subscriptions_subscription_id_unique").on(
      table.subscriptionId,
    ),
    index("crm_push_subscriptions_user_enabled_idx").on(
      table.userId,
      table.enabled,
    ),
  ],
);

export const crmPushPreferences = pgTable(
  "crm_push_preferences",
  {
    ...lifecycleColumns,
    enabled: boolean("enabled").notNull().default(true),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_push_preferences_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.userId],
      foreignColumns: [
        storeMemberships.tenantId,
        storeMemberships.storeId,
        storeMemberships.userId,
      ],
      name: "crm_push_preferences_scoped_membership_fk",
    }),
    uniqueIndex("crm_push_preferences_scope_user_unique").on(
      table.tenantId,
      table.storeId,
      table.userId,
    ),
  ],
);

export const crmPushNotificationOutbox = pgTable(
  "crm_push_notification_outbox",
  {
    ...lifecycleColumns,
    attemptCount: integer("attempt_count").notNull().default(0),
    cycleId: uuid("cycle_id").notNull(),
    deadLetteredAt: timestamp("dead_lettered_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    generation: integer("generation").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull().defaultRandom(),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    leaseToken: uuid("lease_token"),
    messageId: uuid("message_id").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    providerNotificationId: varchar("provider_notification_id", {
      length: 191,
    }),
    state: varchar("state", { length: 24 }).notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    scopedStoreForeignKey(
      table,
      "crm_push_notification_outbox_store_tenant_fk",
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "crm_push_notification_outbox_scoped_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.cycleId, table.threadId],
      foreignColumns: [
        conversationCycles.tenantId,
        conversationCycles.storeId,
        conversationCycles.id,
        conversationCycles.threadId,
      ],
      name: "crm_push_notification_outbox_semantic_cycle_fk",
    }),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.messageId,
        table.cycleId,
        table.threadId,
      ],
      foreignColumns: [
        crmMessages.tenantId,
        crmMessages.storeId,
        crmMessages.id,
        crmMessages.cycleId,
        crmMessages.threadId,
      ],
      name: "crm_push_notification_outbox_semantic_message_fk",
    }),
    check(
      "crm_push_notification_outbox_state_check",
      sql`${table.state} IN ('pending','processing','delivered','dead_letter')`,
    ),
    check(
      "crm_push_notification_outbox_attempt_count_nonnegative",
      sql`${table.attemptCount} >= 0`,
    ),
    check(
      "crm_push_notification_outbox_generation_nonnegative",
      sql`${table.generation} >= 0`,
    ),
    check(
      "crm_push_notification_outbox_lease_state_check",
      sql`(${table.state} = 'processing' AND ${table.leaseToken} IS NOT NULL AND ${table.leaseExpiresAt} IS NOT NULL) OR (${table.state} <> 'processing' AND ${table.leaseToken} IS NULL AND ${table.leaseExpiresAt} IS NULL)`,
    ),
    check(
      "crm_push_notification_outbox_delivery_state_check",
      sql`${table.state} <> 'delivered' OR (${table.deliveredAt} IS NOT NULL AND ${table.providerNotificationId} IS NOT NULL)`,
    ),
    check(
      "crm_push_notification_outbox_dead_letter_state_check",
      sql`${table.state} <> 'dead_letter' OR ${table.deadLetteredAt} IS NOT NULL`,
    ),
    uniqueIndex("crm_push_notification_outbox_cycle_generation_unique").on(
      table.tenantId,
      table.storeId,
      table.cycleId,
      table.generation,
    ),
    uniqueIndex("crm_push_notification_outbox_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("crm_push_notification_outbox_claim_idx").on(
      table.state,
      table.nextAttemptAt,
      table.leaseExpiresAt,
    ),
  ],
);
