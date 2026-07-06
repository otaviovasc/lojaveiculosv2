import {
  boolean,
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
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

export const crmSyncStatus = pgEnum("crm_sync_status", [
  "pending",
  "processed",
  "failed",
  "ignored",
]);

export const crmConnectionProvider = pgEnum("crm_connection_provider", [
  "zapi",
]);

export const crmConnectionStatus = pgEnum("crm_connection_status", [
  "sandbox",
  "active",
  "paused",
  "disconnected",
  "error",
  "archived",
]);

export const crmConnections = pgTable(
  "crm_connections",
  {
    ...lifecycleColumns,
    credentialsRef: jsonb("credentials_ref").notNull().default({}),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    externalConnectionId: varchar("external_connection_id", { length: 191 }),
    externalInstanceId: varchar("external_instance_id", { length: 191 }),
    metadata: jsonb("metadata").notNull().default({}),
    phone: varchar("phone", { length: 40 }),
    provider: crmConnectionProvider("provider").notNull(),
    status: crmConnectionStatus("status").notNull().default("sandbox"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    webhookUrl: varchar("webhook_url", { length: 500 }),
  },
  (table) => [
    index("crm_connections_store_status_idx").on(table.storeId, table.status),
    uniqueIndex("crm_connections_store_provider_name_unique").on(
      table.storeId,
      table.provider,
      table.displayName,
    ),
    uniqueIndex("crm_connections_provider_external_unique").on(
      table.provider,
      table.externalConnectionId,
    ),
  ],
);

export const crmTags = pgTable(
  "crm_tags",
  {
    ...lifecycleColumns,
    color: varchar("color", { length: 16 }).notNull().default("#64748b"),
    connectionId: uuid("connection_id").references(() => crmConnections.id),
    emoji: varchar("emoji", { length: 16 }),
    name: varchar("name", { length: 80 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("crm_tags_store_idx").on(table.storeId, table.sortOrder),
    uniqueIndex("crm_tags_store_connection_name_unique").on(
      table.storeId,
      table.connectionId,
      table.name,
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
