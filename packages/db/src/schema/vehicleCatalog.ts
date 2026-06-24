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
import { lifecycleColumns } from "./_shared.js";

export const vehicleCatalogType = pgEnum("vehicle_catalog_type", [
  "cars",
  "motorcycles",
  "trucks",
]);

export const vehicleCatalogSyncStatus = pgEnum("vehicle_catalog_sync_status", [
  "running",
  "succeeded",
  "failed",
]);

export const vehicleCatalogBrands = pgTable(
  "vehicle_catalog_brands",
  {
    ...lifecycleColumns,
    fipeCode: varchar("fipe_code", { length: 40 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    logoUrl: varchar("logo_url", { length: 500 }),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    vehicleType: vehicleCatalogType("vehicle_type").notNull(),
  },
  (table) => [
    uniqueIndex("vehicle_catalog_brands_type_fipe_unique").on(
      table.vehicleType,
      table.fipeCode,
    ),
    uniqueIndex("vehicle_catalog_brands_type_slug_unique").on(
      table.vehicleType,
      table.slug,
    ),
  ],
);

export const vehicleCatalogModelFamilies = pgTable(
  "vehicle_catalog_model_families",
  {
    ...lifecycleColumns,
    brandId: uuid("brand_id")
      .notNull()
      .references(() => vehicleCatalogBrands.id),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    vehicleType: vehicleCatalogType("vehicle_type").notNull(),
  },
  (table) => [
    index("vehicle_catalog_model_families_brand_idx").on(table.brandId),
    uniqueIndex("vehicle_catalog_model_families_brand_slug_unique").on(
      table.brandId,
      table.slug,
    ),
  ],
);

export const vehicleCatalogVersions = pgTable(
  "vehicle_catalog_versions",
  {
    ...lifecycleColumns,
    brandId: uuid("brand_id")
      .notNull()
      .references(() => vehicleCatalogBrands.id),
    fipeCode: varchar("fipe_code", { length: 40 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    modelFamilyId: uuid("model_family_id")
      .notNull()
      .references(() => vehicleCatalogModelFamilies.id),
    name: varchar("name", { length: 191 }).notNull(),
    slug: varchar("slug", { length: 191 }).notNull(),
    vehicleType: vehicleCatalogType("vehicle_type").notNull(),
  },
  (table) => [
    index("vehicle_catalog_versions_family_idx").on(table.modelFamilyId),
    uniqueIndex("vehicle_catalog_versions_type_brand_fipe_unique").on(
      table.vehicleType,
      table.brandId,
      table.fipeCode,
    ),
  ],
);

export const vehicleCatalogYears = pgTable(
  "vehicle_catalog_years",
  {
    ...lifecycleColumns,
    fipeCode: varchar("fipe_code", { length: 40 }),
    fipeYearCode: varchar("fipe_year_code", { length: 40 }).notNull(),
    fuel: varchar("fuel", { length: 80 }),
    fuelCode: varchar("fuel_code", { length: 40 }),
    isActive: boolean("is_active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    modelYear: integer("model_year"),
    name: varchar("name", { length: 120 }).notNull(),
    priceCents: integer("price_cents"),
    referenceMonth: varchar("reference_month", { length: 80 }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => vehicleCatalogVersions.id),
  },
  (table) => [
    index("vehicle_catalog_years_version_idx").on(table.versionId),
    uniqueIndex("vehicle_catalog_years_version_code_unique").on(
      table.versionId,
      table.fipeYearCode,
    ),
  ],
);

export const vehicleCatalogSyncRuns = pgTable("vehicle_catalog_sync_runs", {
  ...lifecycleColumns,
  brandsSeen: integer("brands_seen").notNull().default(0),
  errorMessage: text("error_message"),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
  modelFamiliesSeen: integer("model_families_seen").notNull().default(0),
  provider: varchar("provider", { length: 40 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  status: vehicleCatalogSyncStatus("status").notNull(),
  vehicleType: vehicleCatalogType("vehicle_type").notNull(),
  versionsSeen: integer("versions_seen").notNull().default(0),
  yearsSeen: integer("years_seen").notNull().default(0),
});
