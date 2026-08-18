import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { crmTags } from "../crm.js";
import { stores, tenants } from "../identity.js";
import { conversationCycles, conversationThreads } from "./conversations.js";
import {
  conversationAttendanceActorKind,
  conversationAttendanceState,
  conversationCommandResult,
} from "./enums.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const conversationThreadTags = pgTable(
  "crm_conversation_thread_tags",
  {
    ...lifecycleColumns,
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => crmTags.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => conversationThreads.id),
  },
  (table) => [
    scopedStoreForeignKey(table, "conversation_thread_tags_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "conversation_thread_tags_scoped_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.tagId],
      foreignColumns: [crmTags.tenantId, crmTags.storeId, crmTags.id],
      name: "conversation_thread_tags_scoped_tag_fk",
    }),
    uniqueIndex("conversation_thread_tags_unique").on(
      table.threadId,
      table.tagId,
    ),
    index("conversation_thread_tags_tag_idx").on(table.tagId, table.threadId),
  ],
);

export const conversationCommandReceipts = pgTable(
  "crm_conversation_command_receipts",
  {
    ...lifecycleColumns,
    commandId: uuid("command_id").notNull(),
    commandType: varchar("command_type", { length: 40 }).notNull(),
    cycleId: uuid("cycle_id").notNull(),
    cycleRevision: bigint("cycle_revision", { mode: "number" }),
    requestFingerprint: varchar("request_fingerprint", {
      length: 64,
    }).notNull(),
    result: conversationCommandResult("result"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    scopedStoreForeignKey(
      table,
      "conversation_command_receipts_store_tenant_fk",
    ),
    check(
      "conversation_command_receipts_completion_consistent",
      sql`(${table.result} IS NULL AND ${table.cycleRevision} IS NULL) OR (${table.result} IS NOT NULL AND ${table.cycleRevision} IS NOT NULL)`,
    ),
    check(
      "conversation_command_receipts_revision_nonnegative",
      sql`${table.cycleRevision} IS NULL OR ${table.cycleRevision} >= 0`,
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "conversation_command_receipts_scoped_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.cycleId, table.threadId],
      foreignColumns: [
        conversationCycles.tenantId,
        conversationCycles.storeId,
        conversationCycles.id,
        conversationCycles.threadId,
      ],
      name: "conversation_command_receipts_semantic_cycle_fk",
    }),
    uniqueIndex("conversation_command_receipts_scope_command_unique").on(
      table.tenantId,
      table.storeId,
      table.commandId,
    ),
    index("conversation_command_receipts_cycle_created_idx").on(
      table.tenantId,
      table.storeId,
      table.cycleId,
      table.createdAt,
    ),
  ],
);

export const conversationAttendanceEvents = pgTable(
  "crm_conversation_attendance_events",
  {
    ...lifecycleColumns,
    actorId: varchar("actor_id", { length: 191 }).notNull(),
    actorKind: conversationAttendanceActorKind("actor_kind").notNull(),
    cycleId: uuid("cycle_id").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 191 }).notNull(),
    interventionId: uuid("intervention_id").notNull(),
    nextState: conversationAttendanceState("next_state").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    previousState: conversationAttendanceState("previous_state").notNull(),
    reason: text("reason").notNull(),
    requestFingerprint: varchar("request_fingerprint", {
      length: 128,
    }).notNull(),
    stateVersion: bigint("state_version", { mode: "number" }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    threadId: uuid("thread_id").notNull(),
  },
  (table) => [
    scopedStoreForeignKey(
      table,
      "conversation_attendance_events_store_tenant_fk",
    ),
    check(
      "conversation_attendance_events_version_positive",
      sql`${table.stateVersion} > 0`,
    ),
    check(
      "conversation_attendance_events_state_changed",
      sql`${table.previousState} <> ${table.nextState}`,
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.cycleId, table.threadId],
      foreignColumns: [
        conversationCycles.tenantId,
        conversationCycles.storeId,
        conversationCycles.id,
        conversationCycles.threadId,
      ],
      name: "conversation_attendance_events_semantic_cycle_fk",
    }),
    uniqueIndex("conversation_attendance_events_scope_key_unique").on(
      table.tenantId,
      table.storeId,
      table.cycleId,
      table.idempotencyKey,
    ),
    uniqueIndex("conversation_attendance_events_scope_version_unique").on(
      table.tenantId,
      table.storeId,
      table.cycleId,
      table.stateVersion,
    ),
    index("conversation_attendance_events_cycle_occurred_idx").on(
      table.cycleId,
      table.occurredAt,
    ),
  ],
);
