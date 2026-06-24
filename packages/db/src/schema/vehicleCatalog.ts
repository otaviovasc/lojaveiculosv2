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
    providerName: varchar("provider_name", { length: 191 }),
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

export const vehicleCatalogReferences = pgTable(
  "vehicle_catalog_references",
  {
    ...lifecycleColumns,
    code: varchar("code", { length: 40 }).notNull(),
    isLatest: boolean("is_latest").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    month: varchar("month", { length: 80 }).notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    rawPayload: jsonb("raw_payload").notNull().default({}),
  },
  (table) => [
    uniqueIndex("vehicle_catalog_references_provider_code_unique").on(
      table.provider,
      table.code,
    ),
  ],
);

export const vehicleCatalogPriceHistory = pgTable(
  "vehicle_catalog_price_history",
  {
    ...lifecycleColumns,
    fipeCode: varchar("fipe_code", { length: 40 }).notNull(),
    fipeYearCode: varchar("fipe_year_code", { length: 40 }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    priceCents: integer("price_cents"),
    priceLabel: varchar("price_label", { length: 80 }),
    provider: varchar("provider", { length: 40 }).notNull(),
    rawPayload: jsonb("raw_payload").notNull().default({}),
    referenceCode: varchar("reference_code", { length: 40 }).notNull(),
    referenceMonth: varchar("reference_month", { length: 80 }).notNull(),
    vehicleType: vehicleCatalogType("vehicle_type").notNull(),
  },
  (table) => [
    index("vehicle_catalog_price_history_fipe_idx").on(
      table.vehicleType,
      table.fipeCode,
      table.fipeYearCode,
    ),
    uniqueIndex("vehicle_catalog_price_history_reference_unique").on(
      table.provider,
      table.vehicleType,
      table.fipeCode,
      table.fipeYearCode,
      table.referenceCode,
    ),
  ],
);

export const vehicleCatalogRawResponses = pgTable(
  "vehicle_catalog_raw_responses",
  {
    ...lifecycleColumns,
    brandCode: varchar("brand_code", { length: 40 }),
    endpoint: varchar("endpoint", { length: 80 }).notNull(),
    fipeCode: varchar("fipe_code", { length: 40 }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    httpStatus: integer("http_status").notNull(),
    modelCode: varchar("model_code", { length: 40 }),
    payload: jsonb("payload").notNull(),
    provider: varchar("provider", { length: 40 }).notNull(),
    referenceCode: varchar("reference_code", { length: 40 }),
    requestKey: varchar("request_key", { length: 500 }).notNull(),
    requestPath: varchar("request_path", { length: 500 }).notNull(),
    syncRunId: uuid("sync_run_id").references(() => vehicleCatalogSyncRuns.id),
    vehicleType: vehicleCatalogType("vehicle_type"),
    yearCode: varchar("year_code", { length: 40 }),
  },
  (table) => [
    index("vehicle_catalog_raw_responses_request_idx").on(
      table.provider,
      table.requestKey,
    ),
    index("vehicle_catalog_raw_responses_sync_run_idx").on(table.syncRunId),
  ],
);
