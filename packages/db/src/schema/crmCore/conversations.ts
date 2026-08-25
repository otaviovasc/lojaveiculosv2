import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
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
import { lifecycleColumns } from "../_shared.js";
import { storeMemberships, stores, tenants, users } from "../identity.js";
import { crmChannelConnections } from "./authorization.js";
import { contacts, opportunities } from "./contacts.js";
import {
  conversationCycleState,
  conversationThreadState,
  messagingChannel,
} from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const conversationThreads = pgTable(
  "crm_conversation_threads",
  {
    ...lifecycleColumns,
    channel: messagingChannel("channel").notNull(),
    channelMetadata: jsonb("channel_metadata").notNull().default({}),
    contactId: uuid("contact_id").references(() => contacts.id),
    customerChatId: varchar("customer_chat_id", { length: 191 }),
    customerDisplayName: varchar("customer_display_name", { length: 191 }),
    customerPhone: varchar("customer_phone", { length: 40 }),
    externalThreadId: varchar("external_thread_id", { length: 191 }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    profilePhotoUrl: text("profile_photo_url"),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => crmChannelConnections.id),
    revision: revisionColumn(),
    source: varchar("source", { length: 80 }),
    state: conversationThreadState("state").notNull().default("open"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "conversation_threads_store_tenant_fk"),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.providerConnectionId,
        table.channel,
      ],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
        crmChannelConnections.channel,
      ],
      name: "conversation_threads_semantic_connection_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "conversation_threads_scoped_contact_fk",
    }),
    revisionCheck(table.revision, "conversation_threads_revision_nonnegative"),
    uniqueIndex("conversation_threads_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("conversation_threads_connection_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.providerConnectionId,
    ),
    uniqueIndex("conversation_threads_connection_external_unique")
      .on(table.providerConnectionId, table.externalThreadId)
      .where(sql`${table.externalThreadId} IS NOT NULL`),
    uniqueIndex("conversation_threads_connection_customer_chat_unique")
      .on(table.providerConnectionId, table.customerChatId)
      .where(sql`${table.customerChatId} IS NOT NULL`),
    uniqueIndex("conversation_threads_connection_customer_phone_unique")
      .on(table.providerConnectionId, table.customerPhone)
      .where(
        sql`${table.customerPhone} IS NOT NULL AND ${table.customerPhone} <> ''`,
      ),
    index("conversation_threads_store_last_message_idx").on(
      table.storeId,
      table.lastMessageAt,
    ),
  ],
);

export const conversationCycles = pgTable(
  "crm_conversation_cycles",
  {
    ...lifecycleColumns,
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    externalCycleId: varchar("external_cycle_id", { length: 191 }),
    firstHandledAt: timestamp("first_handled_at", { withTimezone: true }),
    freshLeadAt: timestamp("fresh_lead_at", { withTimezone: true }),
    lastCustomerReadAt: timestamp("last_customer_read_at", {
      withTimezone: true,
    }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessageContent: text("last_message_content"),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    messageCount: integer("message_count").notNull().default(0),
    metadata: jsonb("metadata").notNull().default({}),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),
    pushNotificationGeneration: integer("push_notification_generation")
      .notNull()
      .default(0),
    revision: revisionColumn(),
    state: conversationCycleState("state").notNull().default("active"),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => conversationThreads.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "conversation_cycles_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.assignedUserId],
      foreignColumns: [
        storeMemberships.tenantId,
        storeMemberships.storeId,
        storeMemberships.userId,
      ],
      name: "conversation_cycles_scoped_assignee_membership_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "conversation_cycles_scoped_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.opportunityId],
      foreignColumns: [
        opportunities.tenantId,
        opportunities.storeId,
        opportunities.id,
      ],
      name: "conversation_cycles_scoped_opportunity_fk",
    }),
    revisionCheck(table.revision, "conversation_cycles_revision_nonnegative"),
    check(
      "conversation_cycles_message_count_nonnegative",
      sql`${table.messageCount} >= 0`,
    ),
    check(
      "conversation_cycles_push_notification_generation_nonnegative",
      sql`${table.pushNotificationGeneration} >= 0`,
    ),
    check(
      "conversation_cycles_closed_state_check",
      sql`${table.closedAt} IS NULL OR ${table.state} IN ('completed', 'expired')`,
    ),
    uniqueIndex("conversation_cycles_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("conversation_cycles_thread_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.threadId,
    ),
    uniqueIndex("conversation_cycles_thread_external_unique").on(
      table.threadId,
      table.externalCycleId,
    ),
    index("conversation_cycles_thread_state_idx").on(
      table.threadId,
      table.state,
    ),
    index("conversation_cycles_store_fresh_idx").on(
      table.storeId,
      table.freshLeadAt,
      table.firstHandledAt,
    ),
    index("conversation_cycles_store_last_message_idx").on(
      table.storeId,
      table.lastMessageAt,
    ),
  ],
);
