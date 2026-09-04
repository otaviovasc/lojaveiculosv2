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
import { crmTags } from "./crm.js";
import { crmChannelConnections } from "./crmCore/authorization.js";
import { conversationThreads } from "./crmCore/conversations.js";
import { crmMessages } from "./crmCore/messages.js";
import { stores, tenants, users } from "./identity.js";
import { leads } from "./leads.js";
import { lifecycleColumns } from "./_shared.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const crmCampaignStatus = pgEnum("crm_campaign_status", [
  "cancelled",
  "completed",
  "draft",
  "paused",
  "scheduled",
]);

export const crmCampaignRecipientStatus = pgEnum(
  "crm_campaign_recipient_status",
  [
    "cancelled",
    "failed",
    "pending",
    "replied",
    "secondary_scheduled",
    "secondary_sent",
    "sent",
  ],
);

export const crmCampaigns = pgTable(
  "crm_campaigns",
  {
    ...lifecycleColumns,
    content: text("content").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    failedCount: integer("failed_count").notNull().default(0),
    initialTagId: uuid("initial_tag_id").references(() => crmTags.id),
    intervalMinutes: integer("interval_minutes").notNull().default(1),
    mediaType: varchar("media_type", { length: 120 }),
    mediaUrl: text("media_url"),
    metadata: jsonb("metadata").notNull().default({}),
    name: varchar("name", { length: 191 }).notNull(),
    repliedCount: integer("replied_count").notNull().default(0),
    replyTagId: uuid("reply_tag_id").references(() => crmTags.id),
    scheduledCount: integer("scheduled_count").notNull().default(0),
    scheduledEndAt: timestamp("scheduled_end_at", {
      withTimezone: true,
    }).notNull(),
    scheduledStartAt: timestamp("scheduled_start_at", {
      withTimezone: true,
    }).notNull(),
    secondaryContent: text("secondary_content"),
    secondaryDelayMinutes: integer("secondary_delay_minutes")
      .notNull()
      .default(1),
    secondarySentCount: integer("secondary_sent_count").notNull().default(0),
    selectedConnectionId: uuid("selected_connection_id"),
    sentCount: integer("sent_count").notNull().default(0),
    status: crmCampaignStatus("status").notNull().default("draft"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    totalRecipients: integer("total_recipients").notNull().default(0),
  },
  (table) => [
    foreignKey({
      columns: [table.selectedConnectionId],
      foreignColumns: [crmChannelConnections.id],
      name: "crm_campaigns_selected_connection_fk",
    }),
    ...(includeCrmScopeForeignKeys
      ? [
          foreignKey({
            columns: [
              table.tenantId,
              table.storeId,
              table.selectedConnectionId,
            ],
            foreignColumns: [
              crmChannelConnections.tenantId,
              crmChannelConnections.storeId,
              crmChannelConnections.id,
            ],
            name: "crm_campaigns_scoped_connection_fk",
          }),
        ]
      : []),
    index("crm_campaigns_store_status_idx").on(
      table.storeId,
      table.status,
      table.createdAt,
    ),
    index("crm_campaigns_store_start_idx").on(
      table.storeId,
      table.scheduledStartAt,
    ),
    uniqueIndex("crm_campaigns_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
  ],
);

export const crmCampaignRecipients = pgTable(
  "crm_campaign_recipients",
  {
    ...lifecycleColumns,
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => crmCampaigns.id),
    connectionId: uuid("connection_id").notNull(),
    errorMessage: text("error_message"),
    initialScheduledMessageId: uuid("initial_scheduled_message_id"),
    initialSentAt: timestamp("initial_sent_at", { withTimezone: true }),
    leadId: uuid("lead_id").references(() => leads.id),
    recipientAddress: varchar("recipient_address", { length: 191 }).notNull(),
    replyContentPreview: text("reply_content_preview"),
    replyMessageId: uuid("reply_message_id"),
    replyReceivedAt: timestamp("reply_received_at", { withTimezone: true }),
    secondaryScheduledMessageId: uuid("secondary_scheduled_message_id"),
    secondarySentAt: timestamp("secondary_sent_at", { withTimezone: true }),
    sentMessageId: uuid("sent_message_id"),
    sequence: integer("sequence").notNull(),
    threadId: uuid("thread_id").notNull(),
    status: crmCampaignRecipientStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    variables: jsonb("variables").notNull().default({}),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [crmChannelConnections.id],
      name: "crm_campaign_recipients_connection_fk",
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
            name: "crm_campaign_recipients_scoped_connection_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.threadId],
            foreignColumns: [
              conversationThreads.tenantId,
              conversationThreads.storeId,
              conversationThreads.id,
            ],
            name: "crm_campaign_recipients_scoped_thread_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.campaignId],
            foreignColumns: [
              crmCampaigns.tenantId,
              crmCampaigns.storeId,
              crmCampaigns.id,
            ],
            name: "crm_campaign_recipients_scoped_campaign_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.leadId],
            foreignColumns: [leads.tenantId, leads.storeId, leads.id],
            name: "crm_campaign_recipients_scoped_lead_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.replyMessageId],
            foreignColumns: [
              crmMessages.tenantId,
              crmMessages.storeId,
              crmMessages.id,
            ],
            name: "crm_campaign_recipients_scoped_reply_message_fk",
          }),
          foreignKey({
            columns: [table.tenantId, table.storeId, table.sentMessageId],
            foreignColumns: [
              crmMessages.tenantId,
              crmMessages.storeId,
              crmMessages.id,
            ],
            name: "crm_campaign_recipients_scoped_sent_message_fk",
          }),
        ]
      : []),
    uniqueIndex("crm_campaign_recipients_campaign_thread_unique").on(
      table.campaignId,
      table.threadId,
    ),
    index("crm_campaign_recipients_campaign_idx").on(
      table.campaignId,
      table.sequence,
    ),
    index("crm_campaign_recipients_thread_status_idx").on(
      table.threadId,
      table.status,
      table.updatedAt,
    ),
  ],
);
