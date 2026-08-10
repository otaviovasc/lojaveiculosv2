import { vehicleListings } from "@lojaveiculosv2/db";
import { describe, expect, it } from "vitest";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import { createFakePublicStorefrontDb } from "./drizzlePublicStorefrontRepository.testSupport.js";

describe("Drizzle public storefront listing pages", () => {
  it("includes the default public gallery in listing summaries", async () => {
    const repository = createDrizzlePublicStorefrontRepository(
      createFakePublicStorefrontDb(),
    );

    const listings = await repository.listPublicListings({
      limit: 12,
      offset: 0,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(listings[0]?.media).toEqual([
      expect.objectContaining({
        kind: "photo",
        url: "https://cdn.local/front.jpg",
      }),
    ]);
  });

  it("applies offset after public visibility ordering", async () => {
    const db = createFakePublicStorefrontDb();
    const repository = createDrizzlePublicStorefrontRepository(db);

    const listings = await repository.listPublicListings({
      limit: 12,
      offset: 1,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(listings).toEqual([]);
    expect(db.queriedTables).toEqual([vehicleListings]);
  });
});
