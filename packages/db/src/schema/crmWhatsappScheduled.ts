import {
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
import { providerConnections } from "./crmCore/authorization.js";
import {
  conversationCycles,
  conversationThreads,
} from "./crmCore/conversations.js";
import { canonicalMessages } from "./crmCore/messages.js";
import { storeMemberships, stores, tenants, users } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";
import { crmWhatsappCampaigns } from "./crmWhatsappCampaigns.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const crmWhatsappScheduledMessageStatus = pgEnum(
  "crm_whatsapp_scheduled_message_status",
  ["cancelled", "failed", "pending", "sending", "sent"],
);

export const crmWhatsappScheduledMessages = pgTable(
  "crm_whatsapp_scheduled_messages",
  {
    ...lifecycleColumns,
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    campaignId: uuid("campaign_id").references(() => crmWhatsappCampaigns.id),
    campaignMessageType: varchar("campaign_message_type", { length: 40 }),
    campaignRecipientKey: varchar("campaign_recipient_key", { length: 191 }),
    campaignSequence: integer("campaign_sequence"),
    connectionId: uuid("connection_id").notNull(),
    cycleId: uuid("cycle_id").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").notNull().default({}),
    phone: varchar("phone", { length: 40 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentMessageId: uuid("sent_message_id"),
    threadId: uuid("thread_id").notNull(),
    status: crmWhatsappScheduledMessageStatus("status")
      .notNull()
      .default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    text: text("text").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [providerConnections.id],
      name: "crm_whatsapp_scheduled_messages_connection_fk",
    }),
    foreignKey({
      columns: [table.sentMessageId],
      foreignColumns: [canonicalMessages.id],
      name: "crm_whatsapp_scheduled_messages_sent_message_fk",
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
            name: "crm_whatsapp_scheduled_messages_scoped_connection_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.threadId],
            foreignColumns: [
              conversationThreads.tenantId,
              conversationThreads.storeId,
              conversationThreads.id,
            ],
            name: "crm_whatsapp_scheduled_messages_scoped_thread_fk",
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
            name: "crm_whatsapp_scheduled_messages_semantic_cycle_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.campaignId],
            foreignColumns: [
              crmWhatsappCampaigns.tenantId,
              crmWhatsappCampaigns.storeId,
              crmWhatsappCampaigns.id,
            ],
            name: "crm_whatsapp_scheduled_messages_scoped_campaign_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.createdByUserId],
            foreignColumns: [
              storeMemberships.tenantId,
              storeMemberships.storeId,
              storeMemberships.userId,
            ],
            name: "crm_whatsapp_scheduled_messages_scoped_creator_membership_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.sentMessageId],
            foreignColumns: [
              canonicalMessages.tenantId,
              canonicalMessages.storeId,
              canonicalMessages.id,
            ],
            name: "crm_whatsapp_scheduled_messages_scoped_sent_message_fk",
          }),
        ]
      : []),
    index("crm_whatsapp_scheduled_messages_campaign_idx").on(
      table.campaignId,
      table.campaignSequence,
    ),
    index("crm_whatsapp_scheduled_messages_due_idx").on(
      table.storeId,
      table.status,
      table.scheduledAt,
    ),
    index("crm_whatsapp_scheduled_messages_thread_idx").on(table.threadId),
    index("crm_whatsapp_scheduled_messages_cycle_idx").on(table.cycleId),
    uniqueIndex("crm_whatsapp_scheduled_messages_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
  ],
);
