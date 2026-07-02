import {
  boolean,
  integer,
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
import { sql } from "drizzle-orm";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";

export const customDomainStatus = pgEnum("custom_domain_status", [
  "not_configured",
  "pending",
  "verified",
  "failed",
]);

export const storefrontMediaAssetKind = pgEnum("storefront_media_asset_kind", [
  "image",
]);

export const storeProfiles = pgTable(
  "store_profiles",
  {
    ...lifecycleColumns,
    addressCity: varchar("address_city", { length: 120 }),
    addressLine1: varchar("address_line_1", { length: 191 }),
    addressLine2: varchar("address_line_2", { length: 191 }),
    addressState: varchar("address_state", { length: 80 }),
    addressZipCode: varchar("address_zip_code", { length: 32 }),
    businessHours: jsonb("business_hours").notNull().default({}),
    contactEmail: varchar("contact_email", { length: 254 }),
    contactPhone: varchar("contact_phone", { length: 40 }),
    documentNumber: varchar("document_number", { length: 32 }),
    logoImageUrl: text("logo_image_url"),
    metadata: jsonb("metadata").notNull().default({}),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    whatsappPhone: varchar("whatsapp_phone", { length: 40 }),
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
    customDomainStatus: customDomainStatus("custom_domain_status")
      .notNull()
      .default("not_configured"),
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
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastDnsCheckAt: timestamp("last_dns_check_at", { withTimezone: true }),
    verificationToken: varchar("verification_token", { length: 120 }),
  },
  (table) => [
    index("store_public_site_settings_tenant_id_idx").on(table.tenantId),
    uniqueIndex("store_public_site_settings_domain_unique").on(
      table.customDomain,
    ),
    uniqueIndex("store_public_site_settings_store_id_unique").on(table.storeId),
  ],
);

export const storeCustomPages = pgTable(
  "store_custom_pages",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    accentColor: varchar("accent_color", { length: 16 }),
    backgroundColor: varchar("background_color", { length: 16 }),
    components: jsonb("components").notNull().default([]),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    fontFamily: varchar("font_family", { length: 120 }),
    isPublished: boolean("is_published").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    mode: varchar("mode", { length: 32 }).notNull().default("modular"),
    pageBackground: jsonb("page_background").notNull().default({}),
    pageChrome: jsonb("page_chrome").notNull().default({}),
    secretToken: varchar("secret_token", { length: 120 }).notNull(),
    seo: jsonb("seo").notNull().default({}),
    slug: varchar("slug", { length: 80 }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 120 }).notNull(),
  },
  (table) => [
    index("store_custom_pages_store_id_idx").on(table.storeId),
    index("store_custom_pages_tenant_id_idx").on(table.tenantId),
    index("store_custom_pages_store_published_idx").on(
      table.storeId,
      table.isPublished,
    ),
    uniqueIndex("store_custom_pages_store_slug_deleted_unique")
      .on(table.storeId, table.slug)
      .where(sql`${table.isDeleted} = false`),
  ],
);

export const storefrontMediaAssets = pgTable(
  "storefront_media_assets",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    contentType: varchar("content_type", { length: 120 }).notNull(),
    fileName: varchar("file_name", { length: 191 }).notNull(),
    height: integer("height"),
    kind: storefrontMediaAssetKind("kind").notNull().default("image"),
    metadata: jsonb("metadata").notNull().default({}),
    publicUrl: text("public_url").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    width: integer("width"),
  },
  (table) => [
    index("storefront_media_assets_store_id_idx").on(table.storeId),
    index("storefront_media_assets_tenant_id_idx").on(table.tenantId),
    uniqueIndex("storefront_media_assets_storage_key_unique").on(
      table.storageKey,
    ),
  ],
);
