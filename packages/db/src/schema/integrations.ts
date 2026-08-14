import {
  check,
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
import { sql } from "drizzle-orm";
import { stores, tenants, users } from "./identity.js";
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
  "submitted",
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
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    config: jsonb("config").notNull().default({}),
    providerAccountId: varchar("provider_account_id", { length: 191 }),
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
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "integration_accounts_store_tenant_fk",
    }),
    uniqueIndex("integration_accounts_store_provider_active_unique")
      .on(table.storeId, table.provider)
      .where(sql`${table.archivedAt} is null`),
    uniqueIndex("integration_accounts_scope_provider_identity_active_unique")
      .on(
        table.tenantId,
        table.storeId,
        table.provider,
        table.providerAccountId,
      )
      .where(
        sql`${table.archivedAt} is null and ${table.providerAccountId} is not null`,
      ),
  ],
);

export const marketplaceOauthTransactions = pgTable(
  "marketplace_oauth_transactions",
  {
    ...lifecycleColumns,
    authorizationCodeCiphertext: text("authorization_code_ciphertext"),
    callbackReceivedAt: timestamp("callback_received_at", {
      withTimezone: true,
    }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    exchangeLeaseExpiresAt: timestamp("exchange_lease_expires_at", {
      withTimezone: true,
    }),
    exchangeLeaseOwner: varchar("exchange_lease_owner", { length: 191 }),
    exchangeTokenCiphertext: text("exchange_token_ciphertext"),
    provider: varchar("provider", { length: 80 }).notNull(),
    redirectUri: varchar("redirect_uri", { length: 500 }).notNull(),
    requestId: varchar("request_id", { length: 191 }).notNull(),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id),
    stateHash: varchar("state_hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    foreignKey({
      columns: [table.storeId, table.tenantId],
      foreignColumns: [stores.id, stores.tenantId],
      name: "marketplace_oauth_transactions_store_tenant_fk",
    }),
    uniqueIndex("marketplace_oauth_transactions_state_hash_unique").on(
      table.stateHash,
    ),
    index("marketplace_oauth_transactions_scope_status_idx").on(
      table.tenantId,
      table.storeId,
      table.status,
      table.expiresAt,
    ),
    check(
      "marketplace_oauth_transactions_state_hash_sha256",
      sql`${table.stateHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "marketplace_oauth_transactions_status_valid",
      sql`${table.status} IN ('pending', 'received', 'exchanging', 'consumed', 'cancelled')`,
    ),
    check(
      "marketplace_oauth_transactions_callback_consistent",
      sql`(
        (${table.status} IN ('received', 'exchanging') AND ${table.callbackReceivedAt} IS NOT NULL AND ${table.authorizationCodeCiphertext} IS NOT NULL AND ${table.consumedAt} IS NULL)
        OR (${table.status} IN ('consumed', 'cancelled') AND ${table.consumedAt} IS NOT NULL)
        OR (${table.status} = 'pending' AND ${table.callbackReceivedAt} IS NULL AND ${table.authorizationCodeCiphertext} IS NULL AND ${table.consumedAt} IS NULL)
      )`,
    ),
    check(
      "marketplace_oauth_transactions_exchange_lease_consistent",
      sql`(
        (${table.status} = 'exchanging' AND ${table.exchangeLeaseOwner} IS NOT NULL AND ${table.exchangeLeaseExpiresAt} IS NOT NULL)
        OR (${table.status} <> 'exchanging' AND ${table.exchangeLeaseOwner} IS NULL AND ${table.exchangeLeaseExpiresAt} IS NULL)
      )`,
    ),
    check(
      "marketplace_oauth_transactions_ttl_valid",
      sql`${table.expiresAt} > ${table.createdAt}`,
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
    dispatchLeaseExpiresAt: timestamp("dispatch_lease_expires_at", {
      withTimezone: true,
    }),
    dispatchLeaseOwner: varchar("dispatch_lease_owner", { length: 191 }),
    errorMessage: varchar("error_message", { length: 500 }),
    idempotencyKey: varchar("idempotency_key", { length: 64 }),
    jobType: varchar("job_type", { length: 120 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    providerOperationExpiresAt: timestamp("provider_operation_expires_at", {
      withTimezone: true,
    }),
    providerOperationTokenCiphertext: text(
      "provider_operation_token_ciphertext",
    ),
    reconciliationAttemptCount: integer("reconciliation_attempt_count")
      .notNull()
      .default(0),
    reconciliationLastCheckedAt: timestamp("reconciliation_last_checked_at", {
      withTimezone: true,
    }),
    reconciliationLeaseExpiresAt: timestamp("reconciliation_lease_expires_at", {
      withTimezone: true,
    }),
    reconciliationLeaseOwner: varchar("reconciliation_lease_owner", {
      length: 191,
    }),
    reconciliationNextAttemptAt: timestamp("reconciliation_next_attempt_at", {
      withTimezone: true,
    }),
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
    index("integration_jobs_stale_dispatch_idx")
      .on(table.tenantId, table.storeId, table.dispatchLeaseExpiresAt)
      .where(sql`${table.status} = 'running'`),
    uniqueIndex("integration_jobs_account_idempotency_unique")
      .on(table.accountId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} IS NOT NULL`),
    index("integration_jobs_reconciliation_due_idx")
      .on(
        table.tenantId,
        table.storeId,
        table.reconciliationNextAttemptAt,
        table.reconciliationLeaseExpiresAt,
      )
      .where(sql`${table.status} = 'submitted'`),
    check(
      "integration_jobs_dispatch_lease_consistent",
      sql`(
        (${table.status} = 'running' AND ${table.dispatchLeaseOwner} IS NOT NULL AND ${table.dispatchLeaseExpiresAt} IS NOT NULL)
        OR (${table.status} <> 'running' AND ${table.dispatchLeaseOwner} IS NULL AND ${table.dispatchLeaseExpiresAt} IS NULL)
      )`,
    ),
    check(
      "integration_jobs_reconciliation_lease_consistent",
      sql`(
        (${table.reconciliationLeaseOwner} IS NULL AND ${table.reconciliationLeaseExpiresAt} IS NULL)
        OR (${table.status} = 'submitted' AND ${table.reconciliationLeaseOwner} IS NOT NULL AND ${table.reconciliationLeaseExpiresAt} IS NOT NULL)
      )`,
    ),
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
