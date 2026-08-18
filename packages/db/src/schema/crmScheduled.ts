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
import { crmChannelConnections } from "./crmCore/authorization.js";
import {
  conversationCycles,
  conversationThreads,
} from "./crmCore/conversations.js";
import { crmMessages } from "./crmCore/messages.js";
import { storeMemberships, stores, tenants, users } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";
import { crmCampaigns } from "./crmCampaigns.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const crmScheduledMessageStatus = pgEnum(
  "crm_scheduled_message_status",
  ["cancelled", "failed", "pending", "sending", "sent"],
);

export const crmScheduledMessages = pgTable(
  "crm_scheduled_messages",
  {
    ...lifecycleColumns,
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    campaignId: uuid("campaign_id").references(() => crmCampaigns.id),
    campaignMessageType: varchar("campaign_message_type", { length: 40 }),
    campaignRecipientKey: varchar("campaign_recipient_key", { length: 191 }),
    campaignSequence: integer("campaign_sequence"),
    connectionId: uuid("connection_id").notNull(),
    cycleId: uuid("cycle_id").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").notNull().default({}),
    recipientAddress: varchar("recipient_address", { length: 191 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentMessageId: uuid("sent_message_id"),
    threadId: uuid("thread_id").notNull(),
    status: crmScheduledMessageStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    content: text("content").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [crmChannelConnections.id],
      name: "crm_scheduled_messages_connection_fk",
    }),
    foreignKey({
      columns: [table.sentMessageId],
      foreignColumns: [crmMessages.id],
      name: "crm_scheduled_messages_sent_message_fk",
    }),
    ...(includeCrmScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.tenantId, table.storeId, table.connectionId],
            foreignColumns: [
              crmChannelConnections.tenantId,
              crmChannelConnections.storeId,
              crmChannelConnections.id,
            ],
            name: "crm_scheduled_messages_scoped_connection_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.threadId],
            foreignColumns: [
              conversationThreads.tenantId,
              conversationThreads.storeId,
              conversationThreads.id,
            ],
            name: "crm_scheduled_messages_scoped_thread_fk",
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
            name: "crm_scheduled_messages_semantic_cycle_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.campaignId],
            foreignColumns: [
              crmCampaigns.tenantId,
              crmCampaigns.storeId,
              crmCampaigns.id,
            ],
            name: "crm_scheduled_messages_scoped_campaign_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.createdByUserId],
            foreignColumns: [
              storeMemberships.tenantId,
              storeMemberships.storeId,
              storeMemberships.userId,
            ],
            name: "crm_scheduled_messages_scoped_creator_membership_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.sentMessageId],
            foreignColumns: [
              crmMessages.tenantId,
              crmMessages.storeId,
              crmMessages.id,
            ],
            name: "crm_scheduled_messages_scoped_sent_message_fk",
          }),
        ]
      : []),
    index("crm_scheduled_messages_campaign_idx").on(
      table.campaignId,
      table.campaignSequence,
    ),
    index("crm_scheduled_messages_due_idx").on(
      table.storeId,
      table.status,
      table.scheduledAt,
    ),
    index("crm_scheduled_messages_thread_idx").on(table.threadId),
    index("crm_scheduled_messages_cycle_idx").on(table.cycleId),
    uniqueIndex("crm_scheduled_messages_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
  ],
);
