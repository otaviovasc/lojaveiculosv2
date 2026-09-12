import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns } from "../_shared.js";
import { stores, tenants } from "../identity.js";
import { scopedStoreForeignKey } from "./scoped.js";

// `is_default` is the fallback for connections without an explicit assignment,
// so the legacy single store-level `crm_external_bot` account migrates intact.
export const crmExternalBotProfiles = pgTable(
  "crm_external_bot_profiles",
  {
    ...lifecycleColumns,
    apiTokenHash: varchar("api_token_hash", { length: 64 }),
    enabled: boolean("enabled").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    name: varchar("name", { length: 160 }).notNull(),
    secretUpdatedAt: timestamp("secret_updated_at", { withTimezone: true }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    webhookSecretHash: varchar("webhook_secret_hash", { length: 71 }),
    webhookSecretSealed: text("webhook_secret_sealed"),
    webhookUrl: varchar("webhook_url", { length: 500 }),
  },
  (table) => [
    scopedStoreForeignKey(table, "crm_external_bot_profiles_store_tenant_fk"),
    check(
      "crm_external_bot_profiles_secret_consistency_check",
      sql`(${table.webhookSecretHash} IS NULL AND ${table.webhookSecretSealed} IS NULL) OR (${table.webhookSecretHash} IS NOT NULL AND ${table.webhookSecretSealed} IS NOT NULL)`,
    ),
    check(
      "crm_external_bot_profiles_enabled_requires_delivery_check",
      sql`(NOT ${table.enabled}) OR (${table.webhookUrl} IS NOT NULL AND ${table.webhookSecretHash} IS NOT NULL AND ${table.webhookSecretSealed} IS NOT NULL)`,
    ),
    uniqueIndex("crm_external_bot_profiles_scope_id_unique").on(
      table.tenantId,
      table.storeId,
      table.id,
    ),
    uniqueIndex("crm_external_bot_profiles_default_unique")
      .on(table.tenantId, table.storeId)
      .where(sql`${table.isDefault} = true`),
    index("crm_external_bot_profiles_store_idx").on(
      table.tenantId,
      table.storeId,
    ),
  ],
);
