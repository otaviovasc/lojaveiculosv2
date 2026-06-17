import {
  index,
  jsonb,
  pgEnum,
  pgTable,
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
