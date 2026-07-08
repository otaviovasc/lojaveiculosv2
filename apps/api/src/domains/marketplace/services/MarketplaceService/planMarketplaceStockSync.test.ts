import { describe, expect, it } from "vitest";
import type {
  MarketplaceCatalogMapping,
  MarketplaceListingProjection,
  MarketplaceProviderListing,
} from "../../ports/marketplaceRepository.js";
import {
  listListingBlockers,
  planMarketplaceStockItem,
} from "./planMarketplaceStockSync.js";

describe("planMarketplaceStockItem", () => {
  it("plans publish for a ready public listing without provider state", () => {
    const item = planMarketplaceStockItem({
      catalogMapping: resolvedMapping(),
      listing: readyListing(),
      provider: "mercado_livre",
      providerListing: null,
    });

    expect(item.decision).toBe("publish");
    expect(item.jobType).toBe("listing_publish");
    expect(item.blockers).toEqual([]);
  });

  it("plans update for a ready public listing with provider state", () => {
    const item = planMarketplaceStockItem({
      catalogMapping: resolvedMapping(),
      listing: readyListing(),
      provider: "olx",
      providerListing: providerListing(),
    });

    expect(item.decision).toBe("update");
    expect(item.externalId).toBe("external_1");
    expect(item.jobType).toBe("listing_update");
  });

  it("plans unpublish for a hidden local listing with provider state", () => {
    const item = planMarketplaceStockItem({
      catalogMapping: null,
      listing: readyListing({ isVisibleOnPublicSite: false }),
      provider: "mercado_livre",
      providerListing: providerListing(),
    });

    expect(item.decision).toBe("unpublish");
    expect(item.jobType).toBe("listing_unpublish");
  });

  it("plans no_op for a non-provider-relevant listing without provider state", () => {
    const item = planMarketplaceStockItem({
      catalogMapping: null,
      listing: readyListing({ status: "draft" }),
      provider: "mercado_livre",
      providerListing: null,
    });

    expect(item.decision).toBe("no_op");
    expect(item.jobType).toBeNull();
  });

  it("blocks public listings that are missing required sync fields", () => {
    const item = planMarketplaceStockItem({
      catalogMapping: null,
      listing: readyListing({
        catalog: null,
        doors: null,
        fuelType: null,
        mediaUrls: [],
        mileageKm: null,
        priceCents: null,
        selectedMedia: [],
      }),
      provider: "mercado_livre",
      providerListing: null,
    });

    expect(item.decision).toBe("blocked");
    expect(item.blockers.map((blocker) => blocker.code)).toEqual([
      "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS",
      "MARKETPLACE_LISTING_PRICE_MISSING",
      "MARKETPLACE_LISTING_FIPE_CATALOG_MISSING",
      "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING",
      "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING",
      "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING",
    ]);
  });

  it("blocks ready FIPE listings when provider mapping is unresolved", () => {
    const blockers = listListingBlockers(readyListing(), {
      ...resolvedMapping(),
      providerBrandCode: null,
      status: "unresolved",
      unresolvedReason: "brand requires operator review",
    });

    expect(blockers).toContainEqual(
      expect.objectContaining({
        code: "MARKETPLACE_LISTING_MAPPING_REQUIRED",
        field: "catalog",
      }),
    );
  });

  it("blocks ready FIPE listings when provider trim mapping is missing", () => {
    const blockers = listListingBlockers(readyListing(), {
      ...resolvedMapping(),
      providerTrimCode: null,
    });

    expect(blockers).toContainEqual(
      expect.objectContaining({
        code: "MARKETPLACE_LISTING_MAPPING_REQUIRED",
        field: "catalog",
      }),
    );
  });

  it("does not block ready FIPE listings when provider mapping is resolved", () => {
    expect(listListingBlockers(readyListing(), resolvedMapping())).toEqual([]);
  });
});

function readyListing(
  overrides: Partial<MarketplaceListingProjection> = {},
): MarketplaceListingProjection {
  return {
    catalog: {
      brandCode: "21",
      brandName: "BMW",
      fipeCode: "001267-0",
      fuel: "Gasolina",
      modelCode: "4828",
      modelName: "M3 Competition M",
      modelYear: 2024,
      referenceMonth: "julho de 2026",
      source: "fipe",
      vehicleType: "cars",
      yearCode: "2024-1",
      yearName: "2024 Gasolina",
    },
    description: "BMW M3 Competition M.",
    doors: 4,
    fuelType: "gasoline",
    isVisibleOnPublicSite: true,
    listingId: "listing_1",
    mediaUrls: ["https://cdn.local/m3-front.jpg"],
    mileageKm: 12000,
    modelYear: 2024,
    priceCents: 75990000,
    publicSlug: "bmw-m3-competition-m-2024",
    selectedMedia: [
      { altText: "BMW M3 dianteira", url: "https://cdn.local/m3-front.jpg" },
    ],
    selectedUnitId: "unit_1",
    status: "published",
    stockLabel: "M3-001",
    title: "BMW M3 Competition M 2024",
    trimName: "Competition M",
    vehicleType: "cars",
    ...overrides,
  };
}

function providerListing(): MarketplaceProviderListing {
  return {
    accountId: "account_1",
    externalId: "external_1",
    listingId: "listing_1",
    metadata: {},
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  };
}

function resolvedMapping(): MarketplaceCatalogMapping {
  return {
    fipeBrandCode: "21",
    fipeCode: "001267-0",
    fipeModelCode: "4828",
    fipeYearCode: "2024-1",
    provider: "mercado_livre",
    providerBrandCode: "BMW",
    providerModelCode: "M3",
    providerTrimCode: "COMPETITION_M",
    providerYearCode: "2024",
    status: "resolved",
    unresolvedReason: null,
    vehicleType: "cars",
  };
}
