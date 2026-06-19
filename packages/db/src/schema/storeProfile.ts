import {
  boolean,
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
import { lifecycleColumns } from "./_shared.js";

export const customDomainStatus = pgEnum("custom_domain_status", [
  "not_configured",
  "pending",
  "verified",
  "failed",
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
