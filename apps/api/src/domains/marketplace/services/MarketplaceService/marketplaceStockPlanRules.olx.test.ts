import { describe, expect, it } from "vitest";
import {
  createResolvedMarketplaceCatalogMapping,
  toTestMarketplaceListing,
} from "../../testSupportMarketplaceRecords.js";
import { listListingBlockers } from "./marketplaceStockPlanRules.js";

describe("OLX marketplace stock blockers", () => {
  it("blocks text, image, and rounded-price violations before Autoupload", () => {
    const repeatedImage = "https://cdn.local/repeated.jpg";
    const listing = {
      ...toTestMarketplaceListing("listing_1"),
      description: "x",
      mediaUrls: [
        repeatedImage,
        repeatedImage,
        ...Array.from(
          { length: 19 },
          (_, index) => `https://cdn.local/vehicle-${index}.jpg`,
        ),
      ],
      priceCents: 1,
      title: " ",
    };

    const blockers = listListingBlockers(
      listing,
      createResolvedMarketplaceCatalogMapping("olx"),
      "olx",
    );

    expect(blockers.map(({ code, field }) => ({ code, field }))).toEqual(
      expect.arrayContaining([
        {
          code: "MARKETPLACE_LISTING_PRICE_MISSING",
          field: "priceCents",
        },
        { code: "MARKETPLACE_LISTING_TEXT_INVALID", field: "title" },
        { code: "MARKETPLACE_LISTING_TEXT_INVALID", field: "description" },
        { code: "MARKETPLACE_LISTING_PHOTOS_INVALID", field: "media" },
      ]),
    );
  });

  it("does not require a provider year id that OLX does not accept", () => {
    const mapping = {
      ...createResolvedMarketplaceCatalogMapping("olx"),
      providerYearCode: null,
    };

    expect(
      listListingBlockers(
        toTestMarketplaceListing("listing_1"),
        mapping,
        "olx",
      ).map((blocker) => blocker.code),
    ).not.toContain("MARKETPLACE_LISTING_MAPPING_REQUIRED");
  });

  it("names missing canonical codes and explains that OLX was not queried", () => {
    const listing = toTestMarketplaceListing("listing_1");
    const blockers = listListingBlockers(
      {
        ...listing,
        catalog: {
          ...listing.catalog!,
          modelCode: null,
          yearCode: null,
        },
      },
      null,
      "olx",
    );

    expect(blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "catalog.modelCode",
          layer: "catalog",
          message: "Catálogo FIPE incompleto: falta o código do modelo.",
        }),
        expect.objectContaining({
          field: "catalog.yearCode",
          layer: "catalog",
          message: "Catálogo FIPE incompleto: falta o código do ano.",
        }),
        expect.objectContaining({
          code: "MARKETPLACE_LISTING_OLX_NOT_QUERIED",
          layer: "provider",
          message:
            "OLX não consultada porque a identidade FIPE está incompleta.",
        }),
      ]),
    );
  });
});
