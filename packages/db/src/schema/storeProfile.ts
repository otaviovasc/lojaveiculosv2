import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns } from "./_shared.js";

export const storeProfiles = pgTable(
  "store_profiles",
  {
    ...lifecycleColumns,
    addressCity: varchar("address_city", { length: 120 }),
    addressLine1: varchar("address_line_1", { length: 191 }),
    addressLine2: varchar("address_line_2", { length: 191 }),
    addressState: varchar("address_state", { length: 80 }),
    addressZipCode: varchar("address_zip_code", { length: 32 }),
    contactEmail: varchar("contact_email", { length: 254 }),
    contactPhone: varchar("contact_phone", { length: 40 }),
    documentNumber: varchar("document_number", { length: 32 }),
    metadata: jsonb("metadata").notNull().default({}),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("store_profiles_tenant_id_idx").on(table.tenantId),
    uniqueIndex("store_profiles_store_id_unique").on(table.storeId),
  ],
);

export const storePublicSiteSettings = pgTable(
  "store_public_site_settings",
  {
    ...lifecycleColumns,
    customDomain: varchar("custom_domain", { length: 191 }),
    heroImageUrl: text("hero_image_url"),
    isPublished: boolean("is_published").notNull().default(false),
    layoutKey: varchar("layout_key", { length: 80 })
      .notNull()
      .default("default"),
    seoDescription: text("seo_description"),
    seoTitle: varchar("seo_title", { length: 191 }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    theme: jsonb("theme").notNull().default({}),
  },
  (table) => [
    index("store_public_site_settings_tenant_id_idx").on(table.tenantId),
    uniqueIndex("store_public_site_settings_domain_unique").on(
      table.customDomain,
    ),
    uniqueIndex("store_public_site_settings_store_id_unique").on(table.storeId),
  ],
);
