import {
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { providerConnections } from "./crmCore/authorization.js";
import {
  conversationCycles,
  conversationThreads,
} from "./crmCore/conversations.js";
import { canonicalMessages } from "./crmCore/messages.js";
import { stores, tenants } from "./identity.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const crmWhatsappOutboundIntentStatus = pgEnum(
  "crm_whatsapp_outbound_intent_status",
  [
    "started",
    "provider_succeeded",
    "completed",
    "failed",
    "retryable_failed",
    "indeterminate",
  ],
);

export const crmWhatsappOutboundIntents = pgTable(
  "crm_whatsapp_outbound_intents",
  {
    ...lifecycleColumns,
    claimToken: uuid("claim_token").notNull(),
    connectionId: uuid("connection_id").notNull(),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    cycleId: uuid("cycle_id"),
    messageId: uuid("message_id"),
    providerResult: jsonb("provider_result"),
    recoveryExpiresAt: timestamp("recovery_expires_at", { withTimezone: true }),
    threadId: uuid("thread_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    status: crmWhatsappOutboundIntentStatus("status")
      .notNull()
      .default("started"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [providerConnections.id],
      name: "crm_whatsapp_outbound_intents_connection_fk",
    }),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [canonicalMessages.id],
      name: "crm_whatsapp_outbound_intents_message_fk",
    }),
    ...(includeCrmScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.tenantId, table.storeId, table.connectionId],
            foreignColumns: [
              providerConnections.tenantId,
              providerConnections.storeId,
              providerConnections.id,
            ],
            name: "crm_whatsapp_outbound_intents_scoped_connection_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.threadId],
            foreignColumns: [
              conversationThreads.tenantId,
              conversationThreads.storeId,
              conversationThreads.id,
            ],
            name: "crm_whatsapp_outbound_intents_scoped_thread_fk",
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
            name: "crm_whatsapp_outbound_intents_semantic_cycle_fk",
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
            name: "crm_whatsapp_outbound_intents_semantic_message_fk",
          }),
        ]
      : []),
    uniqueIndex("crm_whatsapp_outbound_intents_scope_key_unique").on(
      table.tenantId,
      table.storeId,
      table.idempotencyKey,
    ),
    index("crm_whatsapp_outbound_intents_recovery_idx").on(
      table.status,
      table.startedAt,
    ),
    index("crm_whatsapp_outbound_intents_recovery_expiry_idx").on(
      table.recoveryExpiresAt,
    ),
  ],
);
