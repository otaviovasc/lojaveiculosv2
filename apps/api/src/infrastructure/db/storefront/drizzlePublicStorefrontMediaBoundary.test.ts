import { describe, expect, it } from "vitest";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("Drizzle public storefront media boundary", () => {
  it("caps summary-card media at 12 while keeping detail media complete", async () => {
    const media = Array.from({ length: 14 }, (_, index) => ({
      altText: `Photo ${index + 1}`,
      displayOrder: index,
      id: `media_${String(index + 1).padStart(2, "0")}`,
      kind: "photo" as const,
      unitId: "unit_1",
      url: `https://cdn.local/photo-${index + 1}.jpg`,
    }));
    const db = createFakePublicStorefrontDb({ media });
    const repository = createDrizzlePublicStorefrontRepository(db);

    const summaries = await repository.listPublicListings({
      limit: 12,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });
    const detail = await repository.findPublicListingDetail({
      listingSlug: "fiat-toro-2023",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(summaries[0]?.media).toHaveLength(12);
    expect(summaries[0]?.media.at(-1)?.url).toBe(
      "https://cdn.local/photo-12.jpg",
    );
    expect(detail?.media).toHaveLength(14);
    expect(detail?.mediaGroups[0]?.media).toHaveLength(14);
  });
});
