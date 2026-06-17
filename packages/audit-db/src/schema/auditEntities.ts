import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { auditLifecycleColumns } from "./_shared.js";

export const auditEntities = pgTable(
  "audit_entities",
  {
    ...auditLifecycleColumns,
    displayName: varchar("display_name", { length: 191 }),
    entityId: varchar("entity_id", { length: 191 }).notNull(),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata").notNull().default({}),
    storeId: uuid("store_id"),
    tenantId: uuid("tenant_id"),
  },
  (table) => [
    index("audit_entities_entity_idx").on(table.entityType, table.entityId),
    index("audit_entities_last_seen_at_idx").on(table.lastSeenAt),
    index("audit_entities_store_id_idx").on(table.storeId),
    index("audit_entities_tenant_id_idx").on(table.tenantId),
  ],
);
