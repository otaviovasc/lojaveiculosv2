import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants } from "../identity.js";
import { crmChannelConnections } from "./authorization.js";
import { conversationCycles, conversationThreads } from "./conversations.js";
import {
  crmMessageDirection,
  crmMessageOrigin,
  crmMessageSender,
  crmMessageStatus,
  transportProvider,
} from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const crmMessages = pgTable(
  "crm_messages",
  {
    ...lifecycleColumns,
    content: text("content").notNull().default(""),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => conversationCycles.id),
    direction: crmMessageDirection("direction").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    mediaType: varchar("media_type", { length: 120 }),
    mediaUrl: text("media_url"),
    messageType: varchar("message_type", { length: 40 })
      .notNull()
      .default("text"),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    provider: transportProvider("provider").notNull(),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => crmChannelConnections.id),
    providerMessageId: varchar("provider_message_id", { length: 191 }),
    revision: revisionColumn(),
    sender: crmMessageSender("sender").notNull().default("unknown"),
    senderOrigin: crmMessageOrigin("sender_origin")
      .notNull()
      .default("unknown"),
    status: crmMessageStatus("status").notNull().default("pending"),
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
    scopedStoreForeignKey(table, "crm_messages_store_tenant_fk"),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.providerConnectionId,
        table.provider,
      ],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
        crmChannelConnections.provider,
      ],
      name: "crm_messages_semantic_connection_fk",
    }),
    foreignKey({
      columns: [
        table.tenantId,
        table.storeId,
        table.threadId,
        table.providerConnectionId,
      ],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
        conversationThreads.providerConnectionId,
      ],
      name: "crm_messages_semantic_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.cycleId, table.threadId],
      foreignColumns: [
        conversationCycles.tenantId,
        conversationCycles.storeId,
        conversationCycles.id,
        conversationCycles.threadId,
      ],
      name: "crm_messages_semantic_cycle_fk",
    }),
    revisionCheck(table.revision, "crm_messages_revision_nonnegative"),
    uniqueIndex("crm_messages_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("crm_messages_semantic_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
      table.cycleId,
      table.threadId,
    ),
    uniqueIndex("crm_messages_provider_id_unique")
      .on(table.providerConnectionId, table.providerMessageId)
      .where(sql`${table.providerMessageId} IS NOT NULL`),
    index("crm_messages_thread_occurred_idx").on(
      table.threadId,
      table.occurredAt,
    ),
  ],
);
