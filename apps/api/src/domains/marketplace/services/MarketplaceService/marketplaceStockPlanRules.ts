import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceListingProjection,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";
import type { MarketplaceListingBlocker } from "./marketplaceStockPlanTypes.js";
import {
  catalogFieldBlocker,
  createMarketplaceListingBlocker as blocker,
  technicalFieldBlocker,
} from "./marketplaceStockBlockers.js";

export function listListingBlockers(
  listing: MarketplaceListingProjection,
  catalogMapping: MarketplaceCatalogMapping | null,
  provider: MarketplaceProvider = "mercado_livre",
  connectionReady = true,
): MarketplaceListingBlocker[] {
  const blockers: MarketplaceListingBlocker[] = [];
  if (listing.status !== "published" || !listing.isVisibleOnPublicSite) {
    blockers.push(blocker("MARKETPLACE_LISTING_NOT_PUBLIC", "status"));
  }
  if (!listing.mediaUrls.length) {
    blockers.push(blocker("MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS", "media"));
  }
  if (!listing.priceCents || Math.round(listing.priceCents / 100) <= 0) {
    blockers.push(blocker("MARKETPLACE_LISTING_PRICE_MISSING", "priceCents"));
  }
  blockers.push(...catalogBlockers(listing.catalog));
  for (const field of ["fuelType", "doors", "mileageKm"] as const) {
    if (listing[field] === null) {
      blockers.push(technicalFieldBlocker(field));
    }
  }
  if (
    connectionReady &&
    mappingRequired(listing.catalog, catalogMapping, provider)
  ) {
    blockers.push(blocker("MARKETPLACE_LISTING_MAPPING_REQUIRED", "catalog"));
  }
  if (!connectionReady) {
    blockers.push(
      blocker("MARKETPLACE_LISTING_PROVIDER_NOT_QUERIED", "connection"),
    );
  }
  if (
    provider === "olx" &&
    (!listing.catalog ||
      listing.catalog.source !== "fipe" ||
      !isCompleteCatalog(listing.catalog))
  ) {
    blockers.push(blocker("MARKETPLACE_LISTING_OLX_NOT_QUERIED", "catalog"));
  }
  if (provider === "olx") blockers.push(...olxBlockers(listing));
  return blockers;
}

export function shouldUnpublish(listing: MarketplaceListingProjection) {
  return (
    listing.status === "archived" ||
    listing.status === "draft" ||
    listing.status === "in_preparation" ||
    listing.status === "sold_out" ||
    listing.status === "unpublished" ||
    !listing.isVisibleOnPublicSite
  );
}

export function isProviderRelevant(listing: MarketplaceListingProjection) {
  return listing.status === "published" && listing.isVisibleOnPublicSite;
}

export function isCompleteCatalog(catalog: MarketplaceCatalogSnapshot) {
  return Boolean(
    catalog.brandCode &&
    catalog.brandName &&
    catalog.fipeCode &&
    catalog.modelCode &&
    catalog.modelName &&
    catalog.modelYear &&
    catalog.vehicleType &&
    catalog.yearCode &&
    catalog.yearName,
  );
}

function catalogBlockers(
  catalog: MarketplaceCatalogSnapshot | null,
): MarketplaceListingBlocker[] {
  if (!catalog || catalog.source !== "fipe") {
    return [blocker("MARKETPLACE_LISTING_FIPE_CATALOG_MISSING", "catalog")];
  }
  const blockers: MarketplaceListingBlocker[] = [];
  for (const field of [
    "brandCode",
    "brandName",
    "fipeCode",
    "modelCode",
    "modelName",
    "modelYear",
    "vehicleType",
    "yearCode",
    "yearName",
  ] as const) {
    if (catalog[field] === null) {
      blockers.push(catalogFieldBlocker(field));
    }
  }
  return blockers;
}

function mappingRequired(
  catalog: MarketplaceCatalogSnapshot | null,
  mapping: MarketplaceCatalogMapping | null,
  provider: MarketplaceProvider,
) {
  if (!catalog || catalog.source !== "fipe") return false;
  if (!isCompleteCatalog(catalog)) return false;
  return !isCatalogMappingResolvedForProvider(mapping, provider);
}

export function isCatalogMappingResolvedForProvider(
  mapping: MarketplaceCatalogMapping | null,
  provider: MarketplaceProvider,
) {
  return Boolean(
    mapping &&
    mapping.status === "resolved" &&
    mapping.providerBrandCode &&
    mapping.providerModelCode &&
    mapping.providerTrimCode &&
    (provider === "olx" || mapping.providerYearCode),
  );
}

function olxBlockers(
  listing: MarketplaceListingProjection,
): MarketplaceListingBlocker[] {
  const blockers: MarketplaceListingBlocker[] = [];
  if (!validOlxText(listing.title, 90)) {
    blockers.push(blocker("MARKETPLACE_LISTING_TEXT_INVALID", "title"));
  }
  if (!validOlxText(listing.description ?? listing.title, 6000)) {
    blockers.push(blocker("MARKETPLACE_LISTING_TEXT_INVALID", "description"));
  }
  if (!validOlxImages(listing.mediaUrls)) {
    blockers.push(blocker("MARKETPLACE_LISTING_PHOTOS_INVALID", "media"));
  }
  if (!validOlxPhone(listing.contactPhone)) {
    blockers.push(
      blocker("MARKETPLACE_LISTING_CONTACT_PHONE_MISSING", "contactPhone"),
    );
  }
  if (!validOlxZipCode(listing.locationZipCode)) {
    blockers.push(
      blocker(
        "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING",
        "locationZipCode",
      ),
    );
  }
  if (
    listing.condition !== "new" &&
    !validBrazilianPlate(listing.licensePlate)
  ) {
    blockers.push(
      blocker("MARKETPLACE_LISTING_LICENSE_PLATE_MISSING", "licensePlate"),
    );
  }
  return blockers;
}

function validOlxText(value: string, maxLength: number) {
  const length = value.trim().length;
  return length >= 2 && length <= maxLength;
}

function validOlxImages(values: readonly string[]) {
  if (values.length === 0 || values.length > 20) return false;
  const normalized = values.map((value) => value.trim());
  return (
    normalized.every(Boolean) && new Set(normalized).size === values.length
  );
}

function validOlxPhone(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  const withoutCountryCode =
    digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return /^\d{10,11}$/.test(withoutCountryCode);
}

function validOlxZipCode(value: string | null) {
  return /^\d{8}$/.test(value?.replace(/\D/g, "") ?? "");
}

function validBrazilianPlate(value: string | null) {
  const plate = value?.replace(/[^A-Za-z0-9]/g, "").toUpperCase() ?? "";
  return /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate);
}
