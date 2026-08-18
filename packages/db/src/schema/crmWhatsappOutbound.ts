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
import { crmWhatsappMessages, crmWhatsappSessions } from "./crmWhatsapp.js";
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
    messageId: uuid("message_id").references(() => crmWhatsappMessages.id),
    providerResult: jsonb("provider_result"),
    recoveryExpiresAt: timestamp("recovery_expires_at", { withTimezone: true }),
    sessionId: uuid("session_id").references(() => crmWhatsappSessions.id),
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
            columns: [
              table.tenantId,
              table.storeId,
              table.connectionId,
              table.sessionId,
            ],
            foreignColumns: [
              crmWhatsappSessions.tenantId,
              crmWhatsappSessions.storeId,
              crmWhatsappSessions.connectionId,
              crmWhatsappSessions.id,
            ],
            name: "crm_whatsapp_outbound_intents_scoped_session_fk",
          }),
          foreignKey({
            columns: [
              table.tenantId,
              table.storeId,
              table.connectionId,
              table.sessionId,
              table.messageId,
            ],
            foreignColumns: [
              crmWhatsappMessages.tenantId,
              crmWhatsappMessages.storeId,
              crmWhatsappMessages.connectionId,
              crmWhatsappMessages.sessionId,
              crmWhatsappMessages.id,
            ],
            name: "crm_whatsapp_outbound_intents_scoped_message_fk",
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
