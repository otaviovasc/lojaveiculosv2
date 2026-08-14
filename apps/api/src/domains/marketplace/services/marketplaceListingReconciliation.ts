import type {
  MarketplaceListingProjection,
  MarketplaceProvider,
  MarketplaceProviderListing,
} from "../ports/marketplaceRepository.js";
import type { MarketplaceStockPlanItem } from "./MarketplaceService/marketplaceStockPlanTypes.js";

export function removedListingProjection(
  listingId: string,
): MarketplaceListingProjection {
  return {
    catalog: null,
    condition: "used",
    contactPhone: null,
    description: null,
    doors: null,
    fuelType: null,
    isVisibleOnPublicSite: false,
    licensePlate: null,
    listingId,
    locationZipCode: null,
    mediaUrls: [],
    mileageKm: null,
    modelYear: null,
    priceCents: null,
    publicSlug: null,
    selectedMedia: [],
    selectedUnitId: null,
    status: "archived",
    stockLabel: null,
    title: "Anúncio removido do estoque local",
    trimName: null,
    vehicleType: null,
  };
}

export function pendingMarketplaceStockItem(
  listing: MarketplaceListingProjection,
  providerListing: MarketplaceProviderListing | null,
  provider: MarketplaceProvider,
): MarketplaceStockPlanItem {
  return {
    blockers: [],
    decision: "pending",
    externalId: providerListing?.externalId ?? null,
    jobType: null,
    listing,
    provider,
    providerMapping: null,
  };
}

export function readMarketplaceListingId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
