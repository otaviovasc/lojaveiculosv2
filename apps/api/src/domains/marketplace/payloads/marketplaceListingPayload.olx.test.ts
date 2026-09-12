import { describe, expect, it } from "vitest";
import {
  createResolvedMarketplaceCatalogMapping,
  toTestMarketplaceListing,
} from "../testSupportMarketplaceRecords.js";
import {
  createOlxProviderListingId,
  createProviderListingPayload,
} from "./marketplaceListingPayload.js";

describe("OLX marketplace listing payload", () => {
  it("creates a stable contract-safe provider id instead of exposing listing ids", () => {
    const id = createOlxProviderListingId("listing_1");

    expect(id).toBe("lv_59d376efc6a61cd7");
    expect(id).toMatch(/^[A-Za-z0-9_{}-]{1,19}$/);
    expect(id).not.toContain("listing_1");
  });

  it("keeps at most 20 unique non-empty images and official fuel codes", () => {
    const images = Array.from(
      { length: 20 },
      (_, index) => `https://cdn.local/vehicle-${index}.jpg`,
    );
    const mapping = createResolvedMarketplaceCatalogMapping("olx");
    const payload = createProviderListingPayload({
      listing: {
        ...toTestMarketplaceListing("listing_1"),
        fuelType: "hybrid",
        mediaUrls: [...images, images[0]!, "  "],
      },
      provider: "olx",
      settings: { providerMapping: mapping },
    });

    expect(payload.body.images).toEqual(images);
    expect(payload.body.params).toMatchObject({ fuel: "6" });
  });

  it("omits optional empty vehicle parameters", () => {
    const payload = createProviderListingPayload({
      listing: {
        ...toTestMarketplaceListing("listing_1"),
        condition: "new",
        fuelType: "other",
        licensePlate: null,
      },
      provider: "olx",
      settings: {},
    });

    expect(payload.body.params).toEqual({
      doors: "2",
      mileage: 12000,
      regdate: "2024",
      zero_km: "1",
    });
  });
});
