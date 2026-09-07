import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { crmChannelConnections } from "./crmCore/authorization.js";
import { revisionCheck, revisionColumn } from "./crmCore/revision.js";
import { scopedStoreForeignKey } from "./crmCore/scoped.js";
import { crmScheduledMessages } from "./crmScheduled.js";

export const crmSpecialDateType = pgEnum("crm_special_date_type", [
  "birthday",
  "purchaseAnniversary",
  "easter",
  "christmas",
  "mothersDay",
  "fathersDay",
  "blackFriday",
]);

export const crmSpecialDateConfigs = pgTable(
  "crm_special_date_configs",
  {
    ...lifecycleColumns,
    connectionId: uuid("connection_id").notNull(),
    dateType: crmSpecialDateType("date_type").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    leadDays: integer("lead_days").notNull().default(0),
    messageTemplate: text("message_template").notNull().default(""),
    revision: revisionColumn(),
    sendTime: varchar("send_time", { length: 5 }).notNull().default("09:00"),
    storeId: uuid("store_id").notNull(),
    tenantId: uuid("tenant_id").notNull(),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_special_date_configs_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.connectionId],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
      ],
      name: "crm_special_date_configs_scoped_connection_fk",
    }),
    check(
      "crm_special_date_configs_lead_days_chk",
      sql`${table.leadDays} >= 0 AND ${table.leadDays} <= 30`,
    ),
    check(
      "crm_special_date_configs_send_time_chk",
      sql`${table.sendTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    revisionCheck(table.revision, "crm_special_date_configs_revision_chk"),
    uniqueIndex("crm_special_date_configs_connection_type_unique").on(
      table.tenantId,
      table.storeId,
      table.connectionId,
      table.dateType,
    ),
    index("crm_special_date_configs_store_enabled_idx").on(
      table.storeId,
      table.enabled,
    ),
  ],
);

export const crmSpecialDateExecutions = pgTable(
  "crm_special_date_executions",
  {
    ...lifecycleColumns,
    connectionId: uuid("connection_id").notNull(),
    dateType: crmSpecialDateType("date_type").notNull(),
    recipientKey: varchar("recipient_key", { length: 191 }).notNull(),
    configRevision: integer("config_revision").notNull().default(0),
    scheduledMessageId: uuid("scheduled_message_id"),
    status: varchar("status", { length: 32 }).notNull().default("scheduled"),
    storeId: uuid("store_id").notNull(),
    targetYear: integer("target_year").notNull(),
    tenantId: uuid("tenant_id").notNull(),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_special_date_executions_store_tenant_fk"),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.connectionId],
      foreignColumns: [
        crmChannelConnections.tenantId,
        crmChannelConnections.storeId,
        crmChannelConnections.id,
      ],
      name: "crm_special_date_executions_scoped_connection_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.storeId, table.scheduledMessageId],
      foreignColumns: [
        crmScheduledMessages.tenantId,
        crmScheduledMessages.storeId,
        crmScheduledMessages.id,
      ],
      name: "crm_special_date_executions_scoped_scheduled_message_fk",
    }),
    check(
      "crm_special_date_executions_target_year_chk",
      sql`${table.targetYear} >= 2000 AND ${table.targetYear} <= 2100`,
    ),
    check(
      "crm_special_date_executions_status_chk",
      sql`${table.status} IN ('scheduled', 'sent', 'failed', 'cancelled')`,
    ),
    check(
      "crm_special_date_executions_recipient_key_chk",
      sql`length(btrim(${table.recipientKey})) > 0`,
    ),
    check(
      "crm_special_date_executions_config_revision_chk",
      sql`${table.configRevision} >= 0`,
    ),
    uniqueIndex("crm_special_date_executions_unique").on(
      table.tenantId,
      table.storeId,
      table.connectionId,
      table.dateType,
      table.targetYear,
      table.recipientKey,
    ),
    index("crm_special_date_executions_recipient_idx").on(
      table.storeId,
      table.recipientKey,
    ),
  ],
);
