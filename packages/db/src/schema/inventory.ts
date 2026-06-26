import {
  type AnyPgColumn,
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
import { vehicleEngineAspirationValues } from "@lojaveiculosv2/shared";
import { stores, tenants } from "./identity.js";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";

export const vehicleListingStatus = pgEnum("vehicle_listing_status", [
  "draft",
  "in_preparation",
  "published",
  "sold_out",
  "unpublished",
  "archived",
]);

export const vehicleUnitStatus = pgEnum("vehicle_unit_status", [
  "acquired",
  "in_preparation",
  "available",
  "reserved",
  "sold",
  "delivered",
  "inactive",
]);

export const vehicleCondition = pgEnum("vehicle_condition", [
  "new",
  "used",
  "certified_pre_owned",
]);

export const vehicleFuelType = pgEnum("vehicle_fuel_type", [
  "gasoline",
  "ethanol",
  "flex",
  "diesel",
  "hybrid",
  "electric",
  "other",
]);

export const vehicleTransmission = pgEnum("vehicle_transmission", [
  "manual",
  "automatic",
  "automated",
  "cvt",
  "other",
]);

export const vehicleEngineAspiration = pgEnum(
  "vehicle_engine_aspiration",
  vehicleEngineAspirationValues,
);

export const vehicleMediaKind = pgEnum("vehicle_media_kind", [
  "photo",
  "video",
  "document_preview",
]);

export const vehicleCostKind = pgEnum("vehicle_cost_kind", [
  "acquisition",
  "preparation",
  "repair",
  "transport",
  "fee",
  "tax",
  "other",
]);

export const vehicleListings = pgTable(
  "vehicle_listings",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    askingPriceCents: integer("asking_price_cents"),
    condition: vehicleCondition("condition").notNull().default("used"),
    description: text("description"),
    doors: integer("doors"),
    engineAspiration: vehicleEngineAspiration("engine_aspiration"),
    engineDisplacement: varchar("engine_displacement", { length: 32 }),
    featuredUntil: timestamp("featured_until", { withTimezone: true }),
    fuelType: vehicleFuelType("fuel_type"),
    internalNotes: text("internal_notes"),
    isVisibleOnPublicSite: boolean("is_visible_on_public_site")
      .notNull()
      .default(false),
    modelYear: integer("model_year"),
    manufactureYear: integer("manufacture_year"),
    metadata: jsonb("metadata").notNull().default({}),
    mileageKm: integer("mileage_km"),
    publicSlug: varchar("public_slug", { length: 191 }),
    status: vehicleListingStatus("status").notNull().default("draft"),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title: varchar("title", { length: 191 }).notNull(),
    transmission: vehicleTransmission("transmission"),
    trimName: varchar("trim_name", { length: 160 }),
  },
  (table) => [
    index("vehicle_listings_status_idx").on(table.status),
    index("vehicle_listings_store_status_idx").on(table.storeId, table.status),
    index("vehicle_listings_tenant_id_idx").on(table.tenantId),
    uniqueIndex("vehicle_listings_store_slug_unique").on(
      table.storeId,
      table.publicSlug,
    ),
  ],
);

export const vehicleUnits = pgTable(
  "vehicle_units",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    acquisitionDate: timestamp("acquisition_date", { withTimezone: true }),
    acquisitionPriceCents: integer("acquisition_price_cents"),
    colorName: varchar("color_name", { length: 64 }),
    listingId: uuid("listing_id")
      .notNull()
      .references((): AnyPgColumn => vehicleListings.id),
    plate: varchar("plate", { length: 16 }),
    status: vehicleUnitStatus("status").notNull().default("acquired"),
    stockNumber: varchar("stock_number", { length: 80 }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    vin: varchar("vin", { length: 32 }),
  },
  (table) => [
    index("vehicle_units_listing_id_idx").on(table.listingId),
    index("vehicle_units_status_idx").on(table.status),
    index("vehicle_units_store_status_idx").on(table.storeId, table.status),
    index("vehicle_units_tenant_id_idx").on(table.tenantId),
    uniqueIndex("vehicle_units_store_plate_unique").on(
      table.storeId,
      table.plate,
    ),
    uniqueIndex("vehicle_units_store_stock_unique").on(
      table.storeId,
      table.stockNumber,
    ),
    uniqueIndex("vehicle_units_store_vin_unique").on(table.storeId, table.vin),
  ],
);

export const vehiclePlateLookups = pgTable(
  "vehicle_plate_lookups",
  {
    ...lifecycleColumns,
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    plate: varchar("plate", { length: 16 }).notNull(),
    provider: varchar("provider", { length: 80 }).notNull(),
    responsePayload: jsonb("response_payload").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
  },
  (table) => [
    index("vehicle_plate_lookups_store_plate_idx").on(
      table.storeId,
      table.plate,
    ),
    uniqueIndex("vehicle_plate_lookups_store_provider_plate_unique").on(
      table.storeId,
      table.provider,
      table.plate,
    ),
  ],
);

export const vehicleMedia = pgTable(
  "vehicle_media",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    altText: varchar("alt_text", { length: 191 }),
    displayOrder: integer("display_order").notNull().default(0),
    isPublic: boolean("is_public").notNull().default(true),
    kind: vehicleMediaKind("kind").notNull().default("photo"),
    unitId: uuid("unit_id")
      .notNull()
      .references((): AnyPgColumn => vehicleUnits.id),
    metadata: jsonb("metadata").notNull().default({}),
    storageKey: text("storage_key").notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    url: text("url").notNull(),
  },
  (table) => [
    index("vehicle_media_unit_order_idx").on(table.unitId, table.displayOrder),
    index("vehicle_media_store_id_idx").on(table.storeId),
    index("vehicle_media_tenant_id_idx").on(table.tenantId),
  ],
);
