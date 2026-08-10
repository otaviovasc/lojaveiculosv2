import { describe, expect, it } from "vitest";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("Drizzle public storefront migrated V1 metadata", () => {
  it("exposes the migrated Destaque commercial tag", async () => {
    const db = createFakePublicStorefrontDb({
      listings: [
        {
          condition: "used",
          description: null,
          doors: 4,
          engineAspiration: null,
          engineDisplacement: null,
          featuredUntil: null,
          fuelType: "flex",
          listingId: "listing_featured_v1",
          listingMetadata: {
            commercialTags: [
              "Destaque",
              "Blindado",
              "Leilão",
              "Laudo cautelar",
              "Em preparação",
            ],
            legacyFeatured: true,
            legacyV1: { destaque: true, sourceId: "8", sourceTable: "Veiculo" },
          },
          manufactureYear: 2023,
          mileageKm: 12000,
          modelYear: 2024,
          priceCents: 13990000,
          slug: "suv-destaque",
          title: "SUV em destaque",
          transmission: "automatic",
          trimName: null,
        },
      ],
    });
    const repository = createDrizzlePublicStorefrontRepository(db);

    const listings = await repository.listPublicListings({
      limit: 48,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(listings[0]?.commercialTags).toEqual([
      "Destaque",
      "Blindado",
      "Leilão",
      "Laudo cautelar",
      "Em preparação",
    ]);
  });
});
