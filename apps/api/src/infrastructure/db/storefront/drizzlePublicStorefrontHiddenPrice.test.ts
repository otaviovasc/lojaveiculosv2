import { describe, expect, it } from "vitest";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("Drizzle public storefront hidden V1 prices", () => {
  it("returns a nullable public price for a migrated hide_price listing", async () => {
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
          listingId: "listing_hidden_price",
          listingMetadata: {
            legacyV1: {
              hide_price: true,
              sourceId: "12",
              sourceTable: "Veiculo",
            },
          },
          manufactureYear: 2022,
          mileageKm: 22000,
          modelYear: 2023,
          priceCents: 12990000,
          slug: "suv-sem-preco",
          title: "SUV sem preço público",
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
    const detail = await repository.findPublicListingDetail({
      listingSlug: "suv-sem-preco",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(listings[0]?.priceCents).toBeNull();
    expect(detail?.priceCents).toBeNull();
  });

  it("honors the normalized hidePrice migration marker", async () => {
    const db = createFakePublicStorefrontDb({
      listings: [
        {
          condition: "used",
          description: null,
          doors: null,
          engineAspiration: null,
          engineDisplacement: null,
          featuredUntil: null,
          fuelType: null,
          listingId: "listing_hidden_marker",
          listingMetadata: { hidePrice: true },
          manufactureYear: null,
          mileageKm: null,
          modelYear: null,
          priceCents: 9000000,
          slug: "hatch-sem-preco",
          title: "Hatch sem preço público",
          transmission: null,
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

    expect(listings[0]?.priceCents).toBeNull();
  });
});
