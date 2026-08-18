import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { storeMemberships, stores, tenants, users } from "../identity.js";
import { conversationCycles, conversationThreads } from "./conversations.js";
import { conversationAttendanceState } from "./enums.js";
import { revisionCheck, revisionColumn } from "./revision.js";
import { scopedStoreForeignKey } from "./scoped.js";

export const conversationAttendances = pgTable(
  "crm_conversation_attendances",
  {
    ...lifecycleColumns,
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => conversationCycles.id),
    handbackRequestedAt: timestamp("handback_requested_at", {
      withTimezone: true,
    }),
    handoffRequestedAt: timestamp("handoff_requested_at", {
      withTimezone: true,
    }),
    handlingStartedAt: timestamp("handling_started_at", {
      withTimezone: true,
    }),
    historyStartedAt: timestamp("history_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    interventionId: uuid("intervention_id"),
    revision: revisionColumn(),
    state: conversationAttendanceState("state").notNull().default("bot_active"),
    stateVersion: integer("state_version").notNull().default(0),
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
    foreignKey({
      columns: [table.tenantId, table.storeId, table.assignedUserId],
      foreignColumns: [
        storeMemberships.tenantId,
        storeMemberships.storeId,
        storeMemberships.userId,
      ],
      name: "conversation_attendances_scoped_assignee_membership_fk",
    }),
    revisionCheck(
      table.revision,
      "conversation_attendances_revision_nonnegative",
    ),
    check(
      "conversation_attendances_state_version_nonnegative",
      sql`${table.stateVersion} >= 0`,
    ),
    check(
      "conversation_attendances_human_actor_check",
      sql`${table.state} NOT IN ('human_claimed', 'human_active') OR ${table.assignedUserId} IS NOT NULL`,
    ),
    check(
      "conversation_attendances_assignment_timestamp_check",
      sql`${table.assignedUserId} IS NULL OR ${table.assignedAt} IS NOT NULL`,
    ),
    check(
      "conversation_attendances_handoff_timestamp_check",
      sql`${table.state} <> 'handoff_requested' OR ${table.handoffRequestedAt} IS NOT NULL`,
    ),
    check(
      "conversation_attendances_handling_timestamp_check",
      sql`${table.state} <> 'human_active' OR ${table.handlingStartedAt} IS NOT NULL`,
    ),
    uniqueIndex("conversation_attendances_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("conversation_attendances_cycle_unique").on(table.cycleId),
  ],
);
