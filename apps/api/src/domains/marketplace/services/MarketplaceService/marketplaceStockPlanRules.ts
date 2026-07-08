import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceListingProjection,
} from "../../ports/marketplaceRepository.js";
import type {
  MarketplaceListingBlocker,
  MarketplaceListingBlockerCode,
} from "./marketplaceStockPlanTypes.js";

export function listListingBlockers(
  listing: MarketplaceListingProjection,
  catalogMapping: MarketplaceCatalogMapping | null,
): MarketplaceListingBlocker[] {
  if (!isProviderRelevant(listing)) return [];

  const blockers: MarketplaceListingBlocker[] = [];
  if (listing.status !== "published" || !listing.isVisibleOnPublicSite) {
    blockers.push(blocker("MARKETPLACE_LISTING_NOT_PUBLIC", "status"));
  }
  if (!listing.mediaUrls.length) {
    blockers.push(blocker("MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS", "media"));
  }
  if (!listing.priceCents || listing.priceCents <= 0) {
    blockers.push(blocker("MARKETPLACE_LISTING_PRICE_MISSING", "priceCents"));
  }
  blockers.push(...catalogBlockers(listing.catalog));
  for (const field of ["fuelType", "doors", "mileageKm"] as const) {
    if (listing[field] === null) {
      blockers.push(
        blocker("MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING", field),
      );
    }
  }
  if (mappingRequired(listing.catalog, catalogMapping)) {
    blockers.push(blocker("MARKETPLACE_LISTING_MAPPING_REQUIRED", "catalog"));
  }
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
      blockers.push(
        blocker(
          "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING",
          `catalog.${field}`,
        ),
      );
    }
  }
  return blockers;
}

function mappingRequired(
  catalog: MarketplaceCatalogSnapshot | null,
  mapping: MarketplaceCatalogMapping | null,
) {
  if (!catalog || catalog.source !== "fipe") return false;
  if (!isCompleteCatalog(catalog)) return false;
  return (
    !mapping ||
    mapping.status !== "resolved" ||
    !mapping.providerBrandCode ||
    !mapping.providerModelCode ||
    !mapping.providerTrimCode ||
    !mapping.providerYearCode
  );
}

function blocker(
  code: MarketplaceListingBlockerCode,
  field: string,
): MarketplaceListingBlocker {
  return {
    code,
    field,
    message: messages[code],
    userAction: actions[code],
  };
}

const messages: Record<MarketplaceListingBlockerCode, string> = {
  MARKETPLACE_LISTING_CATALOG_FIELD_MISSING: "A FIPE catalog field is missing.",
  MARKETPLACE_LISTING_FIPE_CATALOG_MISSING:
    "The listing is not linked to the FIPE catalog.",
  MARKETPLACE_LISTING_MAPPING_REQUIRED:
    "The FIPE catalog entry is not mapped to the provider taxonomy.",
  MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS: "The listing has no public photos.",
  MARKETPLACE_LISTING_NOT_PUBLIC:
    "The listing is not published on the public site.",
  MARKETPLACE_LISTING_PRICE_MISSING: "The listing price is missing.",
  MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING:
    "A required technical field is missing.",
};

const actions: Record<MarketplaceListingBlockerCode, string> = {
  MARKETPLACE_LISTING_CATALOG_FIELD_MISSING:
    "Complete the FIPE brand, model, version, and year fields.",
  MARKETPLACE_LISTING_FIPE_CATALOG_MISSING:
    "Select the FIPE catalog version for this listing.",
  MARKETPLACE_LISTING_MAPPING_REQUIRED:
    "Resolve the provider catalog mapping before syncing.",
  MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS:
    "Add at least one public listing photo.",
  MARKETPLACE_LISTING_NOT_PUBLIC:
    "Publish the listing and enable public site visibility.",
  MARKETPLACE_LISTING_PRICE_MISSING: "Add an asking price.",
  MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING:
    "Complete fuel, doors, and mileage fields.",
};
