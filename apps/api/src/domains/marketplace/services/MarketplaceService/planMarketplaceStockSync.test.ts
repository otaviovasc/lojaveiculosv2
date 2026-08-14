import { describe, expect, it } from "vitest";
import {
  listListingBlockers,
  planMarketplaceStockItem,
  summarizeMarketplaceStockPlan,
} from "./planMarketplaceStockSync.js";
import {
  providerListing,
  readyListing,
  resolvedMapping,
} from "../../testSupportMarketplaceStockPlan.js";

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

  it("keeps irrelevant historical listings out of customer-facing preview totals", () => {
    const current = planMarketplaceStockItem({
      catalogMapping: resolvedMapping(),
      listing: readyListing(),
      provider: "olx",
      providerListing: null,
    });
    const historical = Array.from({ length: 4 }, (_, index) =>
      planMarketplaceStockItem({
        catalogMapping: null,
        listing: readyListing({
          listingId: `historical_${index}`,
          status: "draft",
        }),
        provider: "olx",
        providerListing: null,
      }),
    );
    const linkedRemoval = planMarketplaceStockItem({
      catalogMapping: null,
      listing: readyListing({
        isVisibleOnPublicSite: false,
        listingId: "linked_removal",
      }),
      provider: "olx",
      providerListing: { ...providerListing(), listingId: "linked_removal" },
    });

    expect(
      summarizeMarketplaceStockPlan([current, ...historical, linkedRemoval]),
    ).toMatchObject({
      noOp: 0,
      pending: 0,
      publish: 1,
      total: 2,
      unpublish: 1,
    });
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

  it("blocks OLX listings missing store contact, CEP, or used vehicle plate", () => {
    const blockers = listListingBlockers(
      readyListing({
        contactPhone: null,
        licensePlate: null,
        locationZipCode: "bad",
      }),
      resolvedMapping(),
      "olx",
    );

    expect(blockers.map((blocker) => blocker.code)).toEqual([
      "MARKETPLACE_LISTING_CONTACT_PHONE_MISSING",
      "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING",
      "MARKETPLACE_LISTING_LICENSE_PLATE_MISSING",
    ]);
  });

  it("does not require a plate for new OLX listings", () => {
    expect(
      listListingBlockers(
        readyListing({ condition: "new", licensePlate: null }),
        resolvedMapping(),
        "olx",
      ).map((blocker) => blocker.code),
    ).not.toContain("MARKETPLACE_LISTING_LICENSE_PLATE_MISSING");
  });
});
