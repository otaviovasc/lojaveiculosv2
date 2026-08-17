import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants, users } from "../identity.js";
import { providerConnections } from "./authorization.js";
import { contacts, opportunities } from "./contacts.js";
import {
  conversationAttendanceState,
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
    contactId: uuid("contact_id").references(() => contacts.id),
    externalThreadId: varchar("external_thread_id", { length: 191 }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    providerConnectionId: uuid("provider_connection_id")
      .notNull()
      .references(() => providerConnections.id),
    revision: revisionColumn(),
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
        providerConnections.tenantId,
        providerConnections.storeId,
        providerConnections.id,
        providerConnections.channel,
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
    metadata: jsonb("metadata").notNull().default({}),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),
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
  ],
);

export const conversationAttendances = pgTable(
  "crm_conversation_attendances",
  {
    ...lifecycleColumns,
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => conversationCycles.id),
    revision: revisionColumn(),
    state: conversationAttendanceState("state").notNull().default("bot_active"),
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
    scopedStoreForeignKey(table, "conversation_attendances_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "conversation_attendances_scoped_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.cycleId, table.threadId],
      foreignColumns: [
        conversationCycles.tenantId,
        conversationCycles.storeId,
        conversationCycles.id,
        conversationCycles.threadId,
      ],
      name: "conversation_attendances_semantic_cycle_fk",
    }),
    revisionCheck(
      table.revision,
      "conversation_attendances_revision_nonnegative",
    ),
    check(
      "conversation_attendances_human_actor_check",
      sql`${table.state} NOT IN ('human_claimed', 'human_active') OR ${table.assignedUserId} IS NOT NULL`,
    ),
    uniqueIndex("conversation_attendances_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("conversation_attendances_cycle_unique").on(table.cycleId),
  ],
);
