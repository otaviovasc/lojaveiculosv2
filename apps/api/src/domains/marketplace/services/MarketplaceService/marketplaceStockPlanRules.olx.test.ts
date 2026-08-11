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
});
