import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { stores, tenants, users } from "./identity.js";
import { vehicleCostKind, vehicleListings, vehicleUnits } from "./inventory.js";
import { lifecycleColumns } from "./_shared.js";

export const vehicleStatusTarget = pgEnum("vehicle_status_target", [
  "listing",
  "unit",
]);

export const vehicleChecklistStatus = pgEnum("vehicle_checklist_status", [
  "pending",
  "in_progress",
  "passed",
  "failed",
  "waived",
]);

export const vehicleCosts = pgTable(
  "vehicle_costs",
  {
    ...lifecycleColumns,
    amountCents: integer("amount_cents").notNull(),
    costDate: timestamp("cost_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    description: text("description"),
    kind: vehicleCostKind("kind").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => vehicleUnits.id),
  },
  (table) => [
    index("vehicle_costs_kind_idx").on(table.kind),
    index("vehicle_costs_store_id_idx").on(table.storeId),
    index("vehicle_costs_tenant_id_idx").on(table.tenantId),
    index("vehicle_costs_unit_id_idx").on(table.unitId),
  ],
);

export const vehiclePriceHistory = pgTable(
  "vehicle_price_history",
  {
    ...lifecycleColumns,
    actorUserId: uuid("actor_user_id").references(() => users.id),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => vehicleListings.id),
    newPriceCents: integer("new_price_cents").notNull(),
    oldPriceCents: integer("old_price_cents"),
    reason: text("reason"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("vehicle_price_history_actor_user_id_idx").on(table.actorUserId),
    index("vehicle_price_history_listing_id_idx").on(table.listingId),
    index("vehicle_price_history_store_id_idx").on(table.storeId),
    index("vehicle_price_history_tenant_id_idx").on(table.tenantId),
  ],
);

export const vehicleStatusHistory = pgTable(
  "vehicle_status_history",
  {
    ...lifecycleColumns,
    actorUserId: uuid("actor_user_id").references(() => users.id),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fromStatus: varchar("from_status", { length: 80 }),
    listingId: uuid("listing_id").references(() => vehicleListings.id),
    reason: text("reason"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    target: vehicleStatusTarget("target").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    toStatus: varchar("to_status", { length: 80 }).notNull(),
    unitId: uuid("unit_id").references(() => vehicleUnits.id),
  },
  (table) => [
    index("vehicle_status_history_listing_id_idx").on(table.listingId),
    index("vehicle_status_history_store_id_idx").on(table.storeId),
    index("vehicle_status_history_tenant_id_idx").on(table.tenantId),
    index("vehicle_status_history_unit_id_idx").on(table.unitId),
  ],
);

export const vehicleChecklists = pgTable(
  "vehicle_checklists",
  {
    ...lifecycleColumns,
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id),
    items: jsonb("items").notNull().default([]),
    name: varchar("name", { length: 120 }).notNull(),
    status: vehicleChecklistStatus("status").notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => vehicleUnits.id),
  },
  (table) => [
    index("vehicle_checklists_completed_by_idx").on(table.completedByUserId),
    index("vehicle_checklists_store_id_idx").on(table.storeId),
    index("vehicle_checklists_tenant_id_idx").on(table.tenantId),
    index("vehicle_checklists_unit_id_idx").on(table.unitId),
  ],
);
