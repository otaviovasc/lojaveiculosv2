import {
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
import { sql } from "drizzle-orm";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants } from "../identity.js";
import { contacts, opportunities } from "./contacts.js";
import { conversationCycles, conversationThreads } from "./conversations.js";
import { crmExternalBotActionCommands } from "./execution.js";
import { scopedStoreForeignKey } from "./scoped.js";

function scopedWorkColumns() {
  return {
    commandId: uuid("command_id")
      .notNull()
      .references(() => crmExternalBotActionCommands.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => conversationCycles.id),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => conversationThreads.id),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  };
}

export const crmTasks = pgTable(
  "crm_tasks",
  {
    ...lifecycleColumns,
    ...scopedWorkColumns(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    state: varchar("state", { length: 24 }).notNull().default("open"),
    title: varchar("title", { length: 300 }).notNull(),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_tasks_store_tenant_fk"),
    check(
      "crm_tasks_state_check",
      sql`${table.state} IN ('open','completed','cancelled')`,
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.commandId],
      foreignColumns: [
        crmExternalBotActionCommands.tenantId,
        crmExternalBotActionCommands.storeId,
        crmExternalBotActionCommands.id,
      ],
      name: "crm_tasks_scoped_command_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "crm_tasks_scoped_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "crm_tasks_scoped_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.cycleId, table.threadId],
      foreignColumns: [
        conversationCycles.tenantId,
        conversationCycles.storeId,
        conversationCycles.id,
        conversationCycles.threadId,
      ],
      name: "crm_tasks_semantic_cycle_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.opportunityId],
      foreignColumns: [
        opportunities.tenantId,
        opportunities.storeId,
        opportunities.id,
      ],
      name: "crm_tasks_scoped_opportunity_fk",
    }),
    uniqueIndex("crm_tasks_command_unique").on(
      table.tenantId,
      table.storeId,
      table.commandId,
    ),
    uniqueIndex("crm_tasks_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    index("crm_tasks_schedule_idx").on(table.storeId, table.state, table.dueAt),
  ],
);

export const crmAppointments = pgTable(
  "crm_appointments",
  {
    ...lifecycleColumns,
    ...scopedWorkColumns(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    state: varchar("state", { length: 24 }).notNull().default("scheduled"),
    summary: text("summary"),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_appointments_store_tenant_fk"),
    check(
      "crm_appointments_state_check",
      sql`${table.state} IN ('scheduled','completed','cancelled','no_show')`,
    ),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.commandId],
      foreignColumns: [
        crmExternalBotActionCommands.tenantId,
        crmExternalBotActionCommands.storeId,
        crmExternalBotActionCommands.id,
      ],
      name: "crm_appointments_scoped_command_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.contactId],
      foreignColumns: [contacts.tenantId, contacts.storeId, contacts.id],
      name: "crm_appointments_scoped_contact_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.threadId],
      foreignColumns: [
        conversationThreads.tenantId,
        conversationThreads.storeId,
        conversationThreads.id,
      ],
      name: "crm_appointments_scoped_thread_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.cycleId, table.threadId],
      foreignColumns: [
        conversationCycles.tenantId,
        conversationCycles.storeId,
        conversationCycles.id,
        conversationCycles.threadId,
      ],
      name: "crm_appointments_semantic_cycle_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.opportunityId],
      foreignColumns: [
        opportunities.tenantId,
        opportunities.storeId,
        opportunities.id,
      ],
      name: "crm_appointments_scoped_opportunity_fk",
    }),
    uniqueIndex("crm_appointments_command_unique").on(
      table.tenantId,
      table.storeId,
      table.commandId,
    ),
    uniqueIndex("crm_appointments_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    index("crm_appointments_schedule_idx").on(
      table.storeId,
      table.state,
      table.startsAt,
    ),
  ],
);
