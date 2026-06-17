import { describe, expect, it } from "vitest";
import { stores, vehicleListings } from "@lojaveiculosv2/db";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("Drizzle public storefront repository", () => {
  it("resolves public store and maps visible listings", async () => {
    const db = createFakePublicStorefrontDb();
    const repository = createDrizzlePublicStorefrontRepository(db);

    const store = await repository.findPublicStoreBySlug("demo");
    const listings = await repository.listPublicListings({
      limit: 12,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(store).toEqual({
      id: "store_1",
      name: "Loja Demo",
      slug: "demo",
      tenantId: "tenant_1",
    });
    expect(listings).toEqual([
      expect.objectContaining({
        listingId: "listing_1",
        slug: "fiat-toro-2023",
        status: "available",
        title: "Fiat Toro Volcano 2023",
      }),
    ]);
    expect(db.queriedTables).toEqual([stores, vehicleListings]);
  });
});
