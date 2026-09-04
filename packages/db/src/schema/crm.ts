import {
  foreignKey,
  index,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { crmChannelConnections } from "./crmCore/authorization.js";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

const includeCrmScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

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
      foreignColumns: [crmChannelConnections.id],
      name: "crm_tags_connection_fk",
    }),
    ...(includeCrmScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.tenantId, table.storeId, table.connectionId],
            foreignColumns: [
              crmChannelConnections.tenantId,
              crmChannelConnections.storeId,
              crmChannelConnections.id,
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
