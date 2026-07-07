import {
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
import { crmConnections, crmTags } from "./crm.js";
import { crmWhatsappSessions } from "./crmWhatsapp.js";
import { stores, tenants, users } from "./identity.js";
import { leads } from "./leads.js";
import { lifecycleColumns } from "./_shared.js";

export const crmWhatsappCampaignStatus = pgEnum(
  "crm_whatsapp_campaign_status",
  ["cancelled", "completed", "draft", "paused", "scheduled"],
);

export const crmWhatsappCampaignRecipientStatus = pgEnum(
  "crm_whatsapp_campaign_recipient_status",
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

export const crmWhatsappCampaigns = pgTable(
  "crm_whatsapp_campaigns",
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
    selectedConnectionId: uuid("selected_connection_id").references(
      () => crmConnections.id,
    ),
    sentCount: integer("sent_count").notNull().default(0),
    status: crmWhatsappCampaignStatus("status").notNull().default("draft"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    totalRecipients: integer("total_recipients").notNull().default(0),
  },
  (table) => [
    index("crm_whatsapp_campaigns_store_status_idx").on(
      table.storeId,
      table.status,
      table.createdAt,
    ),
    index("crm_whatsapp_campaigns_store_start_idx").on(
      table.storeId,
      table.scheduledStartAt,
    ),
  ],
);

export const crmWhatsappCampaignRecipients = pgTable(
  "crm_whatsapp_campaign_recipients",
  {
    ...lifecycleColumns,
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => crmWhatsappCampaigns.id),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => crmConnections.id),
    errorMessage: text("error_message"),
    initialScheduledMessageId: uuid("initial_scheduled_message_id"),
    initialSentAt: timestamp("initial_sent_at", { withTimezone: true }),
    leadId: uuid("lead_id").references(() => leads.id),
    phone: varchar("phone", { length: 40 }).notNull(),
    replyContentPreview: text("reply_content_preview"),
    replyMessageId: uuid("reply_message_id"),
    replyReceivedAt: timestamp("reply_received_at", { withTimezone: true }),
    secondaryScheduledMessageId: uuid("secondary_scheduled_message_id"),
    secondarySentAt: timestamp("secondary_sent_at", { withTimezone: true }),
    sentMessageId: uuid("sent_message_id"),
    sequence: integer("sequence").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => crmWhatsappSessions.id),
    status: crmWhatsappCampaignRecipientStatus("status")
      .notNull()
      .default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    variables: jsonb("variables").notNull().default({}),
  },
  (table) => [
    uniqueIndex("crm_whatsapp_campaign_recipients_campaign_session_unique").on(
      table.campaignId,
      table.sessionId,
    ),
    index("crm_whatsapp_campaign_recipients_campaign_idx").on(
      table.campaignId,
      table.sequence,
    ),
    index("crm_whatsapp_campaign_recipients_session_status_idx").on(
      table.sessionId,
      table.status,
      table.updatedAt,
    ),
  ],
);
