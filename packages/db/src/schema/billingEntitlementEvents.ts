import {
  index,
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { entitlementStatus, stores, tenants } from "./identity.js";

export const storeEntitlementEvents = pgTable(
  "store_entitlement_events",
  {
    ...lifecycleColumns,
    actorId: varchar("actor_id", { length: 191 }),
    featureKey: varchar("feature_key", { length: 80 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    nextStatus: entitlementStatus("next_status").notNull(),
    previousStatus: entitlementStatus("previous_status"),
    reason: text("reason"),
    source: varchar("source", { length: 80 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("store_entitlement_events_store_created_idx").on(
      table.storeId,
      table.createdAt,
    ),
    index("store_entitlement_events_tenant_created_idx").on(
      table.tenantId,
      table.createdAt,
    ),
  ],
);
