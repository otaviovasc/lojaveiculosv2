import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { providerConnections } from "./crmCore/authorization.js";
import {
  conversationCycles,
  conversationThreads,
} from "./crmCore/conversations.js";
import { canonicalMessages } from "./crmCore/messages.js";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const providerEventStatus = pgEnum("provider_event_status", [
  "received",
  "processing",
  "processed",
  "failed",
  "ignored",
]);

export const crmWebhookEffectStatus = pgEnum("crm_webhook_effect_status", [
  "pending",
  "processing",
  "failed",
  "dead_letter",
  "delivered",
]);

export const crmWebhookEffectType = pgEnum("crm_webhook_effect_type", [
  "audit_accepted",
  "bot_message",
  "realtime_message",
  "realtime_session",
]);

export const providerEvents = pgTable(
  "provider_events",
  {
    ...lifecycleColumns,
    connectionId: uuid("connection_id"),
    environment: varchar("environment", { length: 80 }).notNull(),
    errorMessage: text("error_message"),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    payloadDigest: varchar("payload_digest", { length: 64 }),
    processingAttempts: integer("processing_attempts").notNull().default(0),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    processingToken: uuid("processing_token"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerEventId: varchar("provider_event_id", { length: 191 }).notNull(),
    status: providerEventStatus("status").notNull().default("received"),
    storeId: uuid("store_id").references(() => stores.id),
    tenantId: uuid("tenant_id").references(() => tenants.id),
  },
  (table) => [
    check(
      "provider_events_scope_complete_check",
      sql`(${table.storeId} IS NULL AND ${table.tenantId} IS NULL) OR (${table.storeId} IS NOT NULL AND ${table.tenantId} IS NOT NULL)`,
    ),
    check(
      "provider_events_connection_scope_check",
      sql`${table.connectionId} IS NULL OR (${table.storeId} IS NOT NULL AND ${table.tenantId} IS NOT NULL)`,
    ),
    check(
      "provider_events_payload_digest_check",
      sql`${table.payloadDigest} IS NULL OR ${table.payloadDigest} ~ '^[0-9a-f]{64}$'`,
    ),
    ...(includeCrmScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.storeId, table.tenantId],
            foreignColumns: [stores.id, stores.tenantId],
            name: "provider_events_store_tenant_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.connectionId],
            foreignColumns: [
              providerConnections.tenantId,
              providerConnections.storeId,
              providerConnections.id,
            ],
            name: "provider_events_scoped_connection_fk",
          }),
        ]
      : []),
    index("provider_events_status_idx").on(table.status),
    index("provider_events_processing_claim_idx").on(
      table.status,
      table.processingStartedAt,
    ),
    index("provider_events_connection_id_idx").on(table.connectionId),
    index("provider_events_store_id_idx").on(table.storeId),
    index("provider_events_tenant_id_idx").on(table.tenantId),
    uniqueIndex("provider_events_provider_connection_event_unique")
      .on(
        table.provider,
        table.environment,
        table.connectionId,
        table.providerEventId,
      )
      .where(sql`${table.connectionId} IS NOT NULL`),
    uniqueIndex("provider_events_provider_unscoped_event_unique")
      .on(table.provider, table.environment, table.providerEventId)
      .where(sql`${table.connectionId} IS NULL`),
    uniqueIndex("provider_events_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.connectionId,
      table.id,
    ),
  ],
);

export const crmWebhookEffectOutbox = pgTable(
  "crm_webhook_effect_outbox",
  {
    ...lifecycleColumns,
    connectionId: uuid("connection_id").notNull(),
    deadLetteredAt: timestamp("dead_lettered_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    effectType: crmWebhookEffectType("effect_type").notNull(),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    cycleId: uuid("cycle_id").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processingAttempts: integer("processing_attempts").notNull().default(0),
    processingStartedAt: timestamp("processing_started_at", {
      withTimezone: true,
    }),
    processingToken: uuid("processing_token"),
    providerEventId: uuid("provider_event_id")
      .notNull()
      .references(() => providerEvents.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    messageId: uuid("message_id").notNull(),
    status: crmWebhookEffectStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [providerConnections.id],
      name: "crm_webhook_effect_outbox_connection_fk",
    }),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [canonicalMessages.id],
      name: "crm_webhook_effect_outbox_message_fk",
    }),
    ...(includeCrmScopeForeignKeys
      ? [
          foreignKey({
            columns: [
              table.tenantId,
              table.storeId,
              table.connectionId,
              table.providerEventId,
            ],
            foreignColumns: [
              providerEvents.tenantId,
              providerEvents.storeId,
              providerEvents.connectionId,
              providerEvents.id,
            ],
            name: "crm_webhook_effect_outbox_scoped_provider_event_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.connectionId],
            foreignColumns: [
              providerConnections.tenantId,
              providerConnections.storeId,
              providerConnections.id,
            ],
            name: "crm_webhook_effect_outbox_scoped_connection_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.threadId],
            foreignColumns: [
              conversationThreads.tenantId,
              conversationThreads.storeId,
              conversationThreads.id,
            ],
            name: "crm_webhook_effect_outbox_scoped_thread_fk",
          }),
          foreignKey({
            columns: [
              table.tenantId,
              table.storeId,
              table.cycleId,
              table.threadId,
            ],
            foreignColumns: [
              conversationCycles.tenantId,
              conversationCycles.storeId,
              conversationCycles.id,
              conversationCycles.threadId,
            ],
            name: "crm_webhook_effect_outbox_semantic_cycle_fk",
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
              canonicalMessages.tenantId,
              canonicalMessages.storeId,
              canonicalMessages.id,
              canonicalMessages.cycleId,
              canonicalMessages.threadId,
            ],
            name: "crm_webhook_effect_outbox_semantic_message_fk",
          }),
        ]
      : []),
    uniqueIndex("crm_webhook_effect_outbox_event_type_unique").on(
      table.providerEventId,
      table.effectType,
    ),
    index("crm_webhook_effect_outbox_pending_idx").on(
      table.status,
      table.nextAttemptAt,
      table.processingStartedAt,
    ),
    index("crm_webhook_effect_outbox_event_sequence_idx").on(
      table.providerEventId,
      table.sequence,
    ),
  ],
);
