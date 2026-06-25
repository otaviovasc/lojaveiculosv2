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
import { stores, tenants, users } from "./identity.js";
import { leads } from "./leads.js";
import { vehicleUnits } from "./inventory.js";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";

export const vehicleSupplierKind = pgEnum("vehicle_supplier_kind", [
  "lead",
  "person",
  "company",
  "provider",
  "partner",
  "auction",
  "other",
]);

export const vehicleAcquisitionChannel = pgEnum("vehicle_acquisition_channel", [
  "trade_in_lead",
  "direct_person",
  "supplier_company",
  "auto_avaliar",
  "repasse_partner",
  "auction",
  "consignment",
  "marketplace",
  "other",
]);

export const vehicleAcquisitionCommissionTiming = pgEnum(
  "vehicle_acquisition_commission_timing",
  ["acquisition", "reserve", "closed"],
);

export const vehicleSuppliers = pgTable(
  "vehicle_suppliers",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    displayName: varchar("display_name", { length: 191 }).notNull(),
    documentNumber: varchar("document_number", { length: 32 }),
    email: varchar("email", { length: 191 }),
    externalProviderId: varchar("external_provider_id", { length: 191 }),
    kind: vehicleSupplierKind("kind").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    phone: varchar("phone", { length: 32 }),
    provider: varchar("provider", { length: 80 }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("vehicle_suppliers_store_kind_idx").on(table.storeId, table.kind),
    uniqueIndex("vehicle_suppliers_store_document_unique").on(
      table.storeId,
      table.documentNumber,
    ),
  ],
);

export const vehicleUnitAcquisitions = pgTable(
  "vehicle_unit_acquisitions",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    acquisitionDate: timestamp("acquisition_date", { withTimezone: true }),
    acquisitionPriceCents: integer("acquisition_price_cents"),
    acquisitionUserId: uuid("acquisition_user_id").references(() => users.id),
    channel: vehicleAcquisitionChannel("channel").notNull(),
    commissionTiming: vehicleAcquisitionCommissionTiming("commission_timing")
      .notNull()
      .default("closed"),
    customChannelLabel: varchar("custom_channel_label", { length: 120 }),
    leadId: uuid("lead_id").references(() => leads.id),
    metadata: jsonb("metadata").notNull().default({}),
    notes: text("notes"),
    sourceSnapshot: jsonb("source_snapshot").notNull().default({}),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    supplierId: uuid("supplier_id").references(() => vehicleSuppliers.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => vehicleUnits.id),
  },
  (table) => [
    index("vehicle_unit_acquisitions_channel_idx").on(table.channel),
    index("vehicle_unit_acquisitions_lead_id_idx").on(table.leadId),
    index("vehicle_unit_acquisitions_store_channel_idx").on(
      table.storeId,
      table.channel,
    ),
    uniqueIndex("vehicle_unit_acquisitions_unit_unique").on(table.unitId),
  ],
);
