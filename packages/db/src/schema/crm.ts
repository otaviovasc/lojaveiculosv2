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
import { leads } from "./leads.js";
import { stores, tenants, users } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

export const crmSyncStatus = pgEnum("crm_sync_status", [
  "pending",
  "processed",
  "failed",
  "ignored",
]);

export const crmConnectionMappings = pgTable(
  "crm_connection_mappings",
  {
    ...lifecycleColumns,
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    repassesConnectionId: varchar("repasses_connection_id", {
      length: 120,
    }).notNull(),
    status: varchar("status", { length: 80 }).notNull().default("active"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    uniqueIndex("crm_connection_mappings_store_unique").on(table.storeId),
    uniqueIndex("crm_connection_mappings_repasses_unique").on(
      table.repassesConnectionId,
    ),
  ],
);

export const crmAgentMappings = pgTable(
  "crm_agent_mappings",
  {
    ...lifecycleColumns,
    repassesAgentId: varchar("repasses_agent_id", { length: 120 }).notNull(),
    role: varchar("role", { length: 80 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    uniqueIndex("crm_agent_mappings_store_user_unique").on(
      table.storeId,
      table.userId,
    ),
    uniqueIndex("crm_agent_mappings_repasses_unique").on(table.repassesAgentId),
  ],
);

export const crmLeadMappings = pgTable(
  "crm_lead_mappings",
  {
    ...lifecycleColumns,
    channel: varchar("channel", { length: 80 }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    repassesContactId: varchar("repasses_contact_id", { length: 120 }),
    repassesSessionId: varchar("repasses_session_id", {
      length: 120,
    }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("crm_lead_mappings_lead_id_idx").on(table.leadId),
    uniqueIndex("crm_lead_mappings_session_unique").on(table.repassesSessionId),
  ],
);

export const crmTagMappings = pgTable(
  "crm_tag_mappings",
  {
    ...lifecycleColumns,
    isColumn: integer("is_column").notNull().default(0),
    localKey: varchar("local_key", { length: 120 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    repassesTagId: varchar("repasses_tag_id", { length: 120 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    uniqueIndex("crm_tag_mappings_store_local_unique").on(
      table.storeId,
      table.localKey,
    ),
  ],
);

export const crmSyncEvents = pgTable(
  "crm_sync_events",
  {
    ...lifecycleColumns,
    errorMessage: text("error_message"),
    eventKey: varchar("event_key", { length: 191 }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    status: crmSyncStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("crm_sync_events_status_idx").on(table.status),
    uniqueIndex("crm_sync_events_event_key_unique").on(table.eventKey),
  ],
);
