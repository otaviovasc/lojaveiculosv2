import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
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
import { crmTags } from "./crm.js";
import { providerConnections } from "./crmCore/authorization.js";
import { stores, tenants, users } from "./identity.js";
import { leads } from "./leads.js";
import { lifecycleColumns } from "./_shared.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const crmWhatsappChannel = pgEnum("crm_whatsapp_channel", [
  "OLX_CHAT",
  "WEB_CHAT",
  "WHATSAPP",
  "INSTAGRAM",
]);

export const crmWhatsappSessionStatus = pgEnum("crm_whatsapp_session_status", [
  "ACTIVE",
  "COMPLETED",
  "EXPIRED",
  "HUMAN_TAKEOVER",
  "MINIBOT_ACTIVE",
]);

export const crmWhatsappHumanAttendanceState = pgEnum(
  "crm_whatsapp_human_attendance_state",
  ["WAITING_HUMAN", "IN_HUMAN_SERVICE"],
);

export const crmWhatsappMessageDirection = pgEnum(
  "crm_whatsapp_message_direction",
  ["INBOUND", "OUTBOUND"],
);

export const crmWhatsappMessageStatus = pgEnum("crm_whatsapp_message_status", [
  "DELIVERED",
  "FAILED",
  "PENDING",
  "READ",
  "SENT",
]);

export const crmWhatsappMessageSenderType = pgEnum(
  "crm_whatsapp_message_sender_type",
  ["AI", "CUSTOMER", "HUMAN", "SYSTEM"],
);

export const crmWhatsappMessageSenderOrigin = pgEnum(
  "crm_whatsapp_message_sender_origin",
  ["customer", "human_crm", "human_whatsapp", "bot_api", "system", "unknown"],
);

export const crmWhatsappMessageType = pgEnum("crm_whatsapp_message_type", [
  "AUDIO",
  "CATALOG",
  "CONTACT",
  "DOCUMENT",
  "IMAGE",
  "INTERACTIVE",
  "LOCATION",
  "STICKER",
  "TEMPLATE",
  "TEXT",
  "VIDEO",
]);

export const crmWhatsappQuickMessageKind = pgEnum(
  "crm_whatsapp_quick_message_kind",
  ["AUDIO", "IMAGE", "TEXT"],
);

export const crmWhatsappSessions = pgTable(
  "crm_whatsapp_sessions",
  {
    ...lifecycleColumns,
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    buyerChatLid: varchar("buyer_chat_lid", { length: 191 }),
    buyerName: varchar("buyer_name", { length: 191 }),
    buyerPhone: varchar("buyer_phone", { length: 191 }).notNull(),
    channel: crmWhatsappChannel("channel").notNull().default("WHATSAPP"),
    channelExternalId: varchar("channel_external_id", { length: 191 }),
    channelMetadata: jsonb("channel_metadata").notNull().default({}),
    connectionId: uuid("connection_id").notNull(),
    externalSessionId: varchar("external_session_id", { length: 191 }),
    firstHandledAt: timestamp("first_handled_at", { withTimezone: true }),
    freshLeadAt: timestamp("fresh_lead_at", { withTimezone: true }),
    humanAttendanceChangedAt: timestamp("human_attendance_changed_at", {
      withTimezone: true,
    }),
    humanAttendanceState: crmWhatsappHumanAttendanceState(
      "human_attendance_state",
    ),
    humanAttendanceStateVersion: integer("human_attendance_state_version"),
    humanHandlingStartedAt: timestamp("human_handling_started_at", {
      withTimezone: true,
    }),
    humanTakeoverAt: timestamp("human_takeover_at", { withTimezone: true }),
    interventionId: uuid("intervention_id"),
    interventionHistoryStartedAt: timestamp("intervention_history_started_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    lastAssignedAt: timestamp("last_assigned_at", { withTimezone: true }),
    lastCustomerReadAt: timestamp("last_customer_read_at", {
      withTimezone: true,
    }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessageContent: text("last_message_content"),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    leadId: uuid("lead_id").references(() => leads.id),
    messageCount: integer("message_count").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    profilePhotoUrl: text("profile_photo_url"),
    revision: bigint("revision", { mode: "number" }).notNull().default(0),
    source: varchar("source", { length: 80 }),
    status: crmWhatsappSessionStatus("status").notNull().default("ACTIVE"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    check(
      "crm_whatsapp_sessions_revision_nonnegative",
      sql`${table.revision} >= 0`,
    ),
    check(
      "crm_whatsapp_sessions_human_attendance_version_positive",
      sql`${table.humanAttendanceStateVersion} IS NULL OR ${table.humanAttendanceStateVersion} > 0`,
    ),
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [providerConnections.id],
      name: "crm_whatsapp_sessions_connection_fk",
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
            name: "crm_whatsapp_sessions_scoped_connection_fk",
          }),
        ]
      : []),
    check(
      "crm_whatsapp_sessions_human_attendance_active_consistent",
      sql`${table.humanAttendanceState} IS NULL OR (${table.status} = 'HUMAN_TAKEOVER' AND ${table.humanAttendanceChangedAt} IS NOT NULL AND ${table.humanAttendanceStateVersion} IS NOT NULL AND ${table.interventionId} IS NOT NULL)`,
    ),
    check(
      "crm_whatsapp_sessions_human_attendance_handling_consistent",
      sql`(${table.humanAttendanceState} IS DISTINCT FROM 'IN_HUMAN_SERVICE' OR ${table.humanHandlingStartedAt} IS NOT NULL) AND (${table.humanAttendanceState} IS DISTINCT FROM 'WAITING_HUMAN' OR ${table.humanHandlingStartedAt} IS NULL)`,
    ),
    check(
      "crm_whatsapp_sessions_human_attendance_inactive_consistent",
      sql`${table.humanAttendanceState} IS NOT NULL OR (${table.humanHandlingStartedAt} IS NULL AND ${table.interventionId} IS NULL)`,
    ),
    uniqueIndex("crm_whatsapp_sessions_scope_connection_id_unique").on(
      table.tenantId,
      table.storeId,
      table.connectionId,
      table.id,
    ),
    uniqueIndex("crm_whatsapp_sessions_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("crm_whatsapp_sessions_connection_phone_unique")
      .on(table.connectionId, table.buyerPhone)
      .where(sql`${table.buyerPhone} <> ''`),
    uniqueIndex("crm_whatsapp_sessions_connection_channel_external_unique")
      .on(table.connectionId, table.channelExternalId)
      .where(sql`${table.channelExternalId} IS NOT NULL`),
    index("crm_whatsapp_sessions_store_last_message_idx").on(
      table.storeId,
      table.lastMessageAt,
    ),
    index("crm_whatsapp_sessions_store_fresh_idx").on(
      table.storeId,
      table.freshLeadAt,
      table.firstHandledAt,
    ),
    index("crm_whatsapp_sessions_store_lead_idx").on(
      table.storeId,
      table.leadId,
    ),
    index("crm_whatsapp_sessions_store_status_idx").on(
      table.storeId,
      table.status,
    ),
    index("crm_whatsapp_sessions_store_human_attendance_idx").on(
      table.storeId,
      table.humanAttendanceState,
    ),
    uniqueIndex("crm_whatsapp_sessions_connection_external_unique").on(
      table.connectionId,
      table.externalSessionId,
    ),
    uniqueIndex("crm_whatsapp_sessions_connection_lid_unique").on(
      table.connectionId,
      table.buyerChatLid,
    ),
  ],
);

export const crmWhatsappMessages = pgTable(
  "crm_whatsapp_messages",
  {
    ...lifecycleColumns,
    channel: crmWhatsappChannel("channel").notNull().default("WHATSAPP"),
    channelMessageId: varchar("channel_message_id", { length: 191 }),
    connectionId: uuid("connection_id").notNull(),
    content: text("content").notNull().default(""),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    direction: crmWhatsappMessageDirection("direction").notNull(),
    externalId: varchar("external_id", { length: 191 }),
    mediaType: varchar("media_type", { length: 120 }),
    mediaUrl: text("media_url"),
    metadata: jsonb("metadata").notNull().default({}),
    providerTimestamp: timestamp("provider_timestamp", { withTimezone: true }),
    senderType: crmWhatsappMessageSenderType("sender_type").notNull(),
    senderOrigin: crmWhatsappMessageSenderOrigin("sender_origin")
      .notNull()
      .default("unknown"),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => crmWhatsappSessions.id),
    status: crmWhatsappMessageStatus("status").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    type: crmWhatsappMessageType("type").notNull().default("TEXT"),
  },
  (table) => [
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [providerConnections.id],
      name: "crm_whatsapp_messages_connection_fk",
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
            name: "crm_whatsapp_messages_scoped_connection_fk",
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
            name: "crm_whatsapp_messages_scoped_session_fk",
          }),
        ]
      : []),
    uniqueIndex("crm_whatsapp_messages_scope_connection_session_id_unique").on(
      table.tenantId,
      table.storeId,
      table.connectionId,
      table.sessionId,
      table.id,
    ),
    index("crm_whatsapp_messages_session_created_idx").on(
      table.sessionId,
      table.createdAt,
    ),
    index("crm_whatsapp_messages_session_provider_idx").on(
      table.sessionId,
      table.providerTimestamp,
    ),
    index("crm_whatsapp_messages_store_created_idx").on(
      table.storeId,
      table.createdAt,
    ),
    uniqueIndex("crm_whatsapp_messages_session_external_unique").on(
      table.sessionId,
      table.externalId,
    ),
  ],
);

export const crmWhatsappSessionTags = pgTable(
  "crm_whatsapp_session_tags",
  {
    ...lifecycleColumns,
    sessionId: uuid("session_id")
      .notNull()
      .references(() => crmWhatsappSessions.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => crmTags.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("crm_whatsapp_session_tags_session_idx").on(table.sessionId),
    index("crm_whatsapp_session_tags_tag_idx").on(table.tagId),
    uniqueIndex("crm_whatsapp_session_tags_unique").on(
      table.sessionId,
      table.tagId,
    ),
  ],
);

export const crmWhatsappQuickMessages = pgTable(
  "crm_whatsapp_quick_messages",
  {
    ...lifecycleColumns,
    content: text("content").notNull().default(""),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    kind: crmWhatsappQuickMessageKind("kind").notNull().default("TEXT"),
    mediaType: varchar("media_type", { length: 120 }),
    mediaUrl: text("media_url"),
    shortcut: varchar("shortcut", { length: 50 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    storageKey: text("storage_key"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 160 }).notNull(),
  },
  (table) => [
    index("crm_whatsapp_quick_messages_store_idx").on(
      table.storeId,
      table.sortOrder,
    ),
    uniqueIndex("crm_whatsapp_quick_messages_store_shortcut_unique").on(
      table.storeId,
      table.shortcut,
    ),
  ],
);
