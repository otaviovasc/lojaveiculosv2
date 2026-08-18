import {
  boolean,
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
import { providerConnections } from "./crmCore/authorization.js";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const crmSyncStatus = pgEnum("crm_sync_status", [
  "pending",
  "processed",
  "failed",
  "ignored",
]);

export const crmTags = pgTable(
  "crm_tags",
  {
    ...lifecycleColumns,
    color: varchar("color", { length: 16 }).notNull().default("#64748b"),
    connectionId: uuid("connection_id"),
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
    foreignKey({
      columns: [table.connectionId],
      foreignColumns: [providerConnections.id],
      name: "crm_tags_connection_fk",
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
            name: "crm_tags_scoped_connection_fk",
          }),
        ]
      : []),
    index("crm_tags_store_idx").on(table.storeId, table.sortOrder),
    uniqueIndex("crm_tags_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
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
