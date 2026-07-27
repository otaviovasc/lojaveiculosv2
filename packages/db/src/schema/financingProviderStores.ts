import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "./_shared.js";
import { financingProviderAccounts } from "./financingProviders.js";
import { stores, tenants } from "./identity.js";

const includeFinancingScopeForeignKeys =
  process.env.DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP !== "true";

export const financingProviderStoreMappingStatus = pgEnum(
  "financing_provider_store_mapping_status",
  ["active", "inactive", "error", "archived"],
);

export const financingProviderBankStatus = pgEnum(
  "financing_provider_bank_status",
  ["unknown", "okay", "restricted", "error", "inactive"],
);

export const financingProviderStoreMappings = pgTable(
  "financing_provider_store_mappings",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id").notNull(),
    externalStoreId: varchar("external_store_id", { length: 191 }).notNull(),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    status: financingProviderStoreMappingStatus("status")
      .notNull()
      .default("active"),
    storeId: uuid("store_id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeFinancingScopeForeignKeys
      ? [
          foreignKey({
            columns: [table.accountId, table.tenantId],
            foreignColumns: [
              financingProviderAccounts.id,
              financingProviderAccounts.tenantId,
            ],
            name: "financing_provider_store_mappings_account_scope_fk",
          }).onDelete("cascade"),
          foreignKey({
            columns: [table.storeId, table.tenantId],
            foreignColumns: [stores.id, stores.tenantId],
            name: "financing_provider_store_mappings_store_scope_fk",
          }).onDelete("cascade"),
        ]
      : []),
    uniqueIndex("financing_provider_store_mappings_id_scope_unique").on(
      table.id,
      table.accountId,
      table.tenantId,
      table.storeId,
    ),
    uniqueIndex("financing_provider_store_mappings_local_unique").on(
      table.accountId,
      table.storeId,
    ),
    uniqueIndex("financing_provider_store_mappings_external_unique").on(
      table.accountId,
      table.externalStoreId,
    ),
    index("financing_provider_store_mappings_store_status_idx").on(
      table.storeId,
      table.status,
    ),
    check(
      "financing_provider_store_mappings_external_store_present",
      sql`length(trim(${table.externalStoreId})) > 0`,
    ),
  ],
);

export const financingProviderStoreBanks = pgTable(
  "financing_provider_store_banks",
  {
    ...lifecycleColumns,
    accountId: uuid("account_id").notNull(),
    bankFebrabanCode: varchar("bank_febraban_code", { length: 16 }).notNull(),
    bankName: varchar("bank_name", { length: 120 }),
    credentialStatus: financingProviderBankStatus("credential_status")
      .notNull()
      .default("unknown"),
    externalBankId: varchar("external_bank_id", { length: 191 }),
    isActive: boolean("is_active").notNull().default(true),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    mappingId: uuid("mapping_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    storeId: uuid("store_id").notNull(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    ...(includeFinancingScopeForeignKeys
      ? [
          foreignKey({
            columns: [
              table.mappingId,
              table.accountId,
              table.tenantId,
              table.storeId,
            ],
            foreignColumns: [
              financingProviderStoreMappings.id,
              financingProviderStoreMappings.accountId,
              financingProviderStoreMappings.tenantId,
              financingProviderStoreMappings.storeId,
            ],
            name: "financing_provider_store_banks_mapping_scope_fk",
          }).onDelete("cascade"),
        ]
      : []),
    uniqueIndex("financing_provider_store_banks_mapping_code_unique").on(
      table.mappingId,
      table.bankFebrabanCode,
    ),
    index("financing_provider_store_banks_store_status_idx").on(
      table.storeId,
      table.isActive,
      table.credentialStatus,
    ),
    check(
      "financing_provider_store_banks_code_present",
      sql`length(trim(${table.bankFebrabanCode})) > 0`,
    ),
  ],
);
