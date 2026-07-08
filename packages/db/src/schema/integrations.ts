import {
  index,
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
import { vehicleListings } from "./inventory.js";
import { lifecycleColumns } from "./_shared.js";

export const integrationStatus = pgEnum("integration_status", [
  "active",
  "inactive",
  "error",
]);

export const integrationJobStatus = pgEnum("integration_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const marketplaceCatalogMappingStatus = pgEnum(
  "marketplace_catalog_mapping_status",
  ["resolved", "unresolved"],
);

export const integrationAccounts = pgTable(
  "integration_accounts",
  {
    ...lifecycleColumns,
    config: jsonb("config").notNull().default({}),
    provider: varchar("provider", { length: 80 }).notNull(),
    status: integrationStatus("status").notNull().default("inactive"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    uniqueIndex("integration_accounts_store_provider_unique").on(
      table.storeId,
      table.provider,
    ),
  ],
);

export const integrationJobs = pgTable(
  "integration_jobs",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id")
      .notNull()
      .references(() => integrationAccounts.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: varchar("error_message", { length: 500 }),
    jobType: varchar("job_type", { length: 120 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    status: integrationJobStatus("status").notNull().default("queued"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("integration_jobs_account_id_idx").on(table.accountId),
    index("integration_jobs_store_status_idx").on(table.storeId, table.status),
  ],
);

export const vehicleProviderListings = pgTable(
  "vehicle_provider_listings",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id")
      .notNull()
      .references(() => integrationAccounts.id),
    externalId: varchar("external_id", { length: 191 }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => vehicleListings.id),
    metadata: jsonb("metadata").notNull().default({}),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("vehicle_provider_listings_external_id_idx").on(table.externalId),
    uniqueIndex("vehicle_provider_listings_account_listing_unique").on(
      table.accountId,
      table.listingId,
    ),
  ],
);

export const marketplaceProviderTaxonomies = pgTable(
  "marketplace_provider_taxonomies",
  {
    ...lifecycleColumns,
    metadata: jsonb("metadata").notNull().default({}),
    name: varchar("name", { length: 191 }).notNull(),
    parentProviderCode: varchar("parent_provider_code", { length: 120 }),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerCode: varchar("provider_code", { length: 120 }).notNull(),
    taxonomyType: varchar("taxonomy_type", { length: 80 }).notNull(),
    vehicleType: varchar("vehicle_type", { length: 40 }),
  },
  (table) => [
    index("marketplace_provider_taxonomies_provider_type_idx").on(
      table.provider,
      table.taxonomyType,
    ),
    uniqueIndex("marketplace_provider_taxonomies_provider_code_unique").on(
      table.provider,
      table.taxonomyType,
      table.providerCode,
    ),
  ],
);

export const marketplaceCatalogMappings = pgTable(
  "marketplace_catalog_mappings",
  {
    ...lifecycleColumns,
    fipeBrandCode: varchar("fipe_brand_code", { length: 40 }).notNull(),
    fipeCode: varchar("fipe_code", { length: 40 }).notNull(),
    fipeModelCode: varchar("fipe_model_code", { length: 40 }).notNull(),
    fipeYearCode: varchar("fipe_year_code", { length: 40 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerBrandCode: varchar("provider_brand_code", { length: 120 }),
    providerModelCode: varchar("provider_model_code", { length: 120 }),
    providerTrimCode: varchar("provider_trim_code", { length: 120 }),
    providerYearCode: varchar("provider_year_code", { length: 120 }),
    status: marketplaceCatalogMappingStatus("status")
      .notNull()
      .default("unresolved"),
    unresolvedReason: text("unresolved_reason"),
    vehicleType: varchar("vehicle_type", { length: 40 }).notNull(),
  },
  (table) => [
    index("marketplace_catalog_mappings_provider_status_idx").on(
      table.provider,
      table.status,
    ),
    uniqueIndex("marketplace_catalog_mappings_provider_fipe_unique").on(
      table.provider,
      table.vehicleType,
      table.fipeBrandCode,
      table.fipeModelCode,
      table.fipeCode,
      table.fipeYearCode,
    ),
  ],
);
