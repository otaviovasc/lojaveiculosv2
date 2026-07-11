import { describe, expect, it } from "vitest";
import { findListingGallery } from "./drizzlePublicStorefrontGallery.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("findListingGallery", () => {
  it("uses public video media as hero media before photos", async () => {
    const db = createFakePublicStorefrontDb({
      media: [
        {
          altText: "Front photo",
          displayOrder: 0,
          kind: "photo",
          unitId: "unit_1",
          url: "https://cdn.local/front.jpg",
        },
        {
          altText: "Walkaround video",
          displayOrder: 1,
          kind: "video",
          unitId: "unit_1",
          url: "https://cdn.local/walkaround.mp4",
        },
      ],
    });

    const gallery = await findListingGallery(db, {
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(gallery.heroMedia).toEqual({
      altText: "Walkaround video",
      displayOrder: 1,
      kind: "video",
      unitColorName: "Preto",
      unitId: "unit_1",
      url: "https://cdn.local/walkaround.mp4",
    });
    expect(gallery.thumbnailUrl).toBe("https://cdn.local/front.jpg");
  });

  it("uses a video from another public unit before the default unit photo", async () => {
    const db = createFakePublicStorefrontDb({
      media: [
        {
          altText: "Front photo",
          displayOrder: 0,
          kind: "photo",
          unitId: "unit_1",
          url: "https://cdn.local/front.jpg",
        },
        {
          altText: "Blue walkaround",
          displayOrder: 0,
          kind: "video",
          unitId: "unit_2",
          url: "https://cdn.local/blue-walkaround.mp4",
        },
      ],
      units: [
        {
          colorName: "Preto",
          id: "unit_1",
          status: "available",
          stockNumber: "LV-0001",
        },
        {
          colorName: "Azul",
          id: "unit_2",
          status: "reserved",
          stockNumber: "LV-0002",
        },
      ],
    });

    const gallery = await findListingGallery(db, {
      listingId: "listing_1",
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    expect(gallery.defaultMedia[0]?.url).toBe("https://cdn.local/front.jpg");
    expect(gallery.heroMedia?.url).toBe(
      "https://cdn.local/blue-walkaround.mp4",
    );
    expect(gallery.thumbnailUrl).toBe("https://cdn.local/front.jpg");
  });
});
