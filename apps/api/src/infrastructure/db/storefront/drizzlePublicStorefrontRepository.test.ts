import { describe, expect, it } from "vitest";
import {
  storePublicSiteSettings,
  stores,
  vehicleListings,
  vehicleMedia,
} from "@lojaveiculosv2/db";
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
        slug: "fiat-toro-2023",
        status: "available",
        thumbnailUrl: "https://cdn.local/front.jpg",
        title: "Fiat Toro Volcano 2023",
      }),
    ]);
    expect(db.queriedTables).toEqual([
      stores,
      storePublicSiteSettings,
      vehicleListings,
      vehicleMedia,
    ]);
  });

  it("maps published public site settings without domain verification data", async () => {
    const db = createFakePublicStorefrontDb();
    const repository = createDrizzlePublicStorefrontRepository(db);

    const site = await repository.findPublicSiteBySlug("demo");

    expect(site).toEqual({
      contact: {
        city: "Sao Paulo",
        contactEmail: "contato@demo.com.br",
        contactPhone: null,
        whatsappPhone: "5511999999999",
        whatsappUrl: "https://wa.me/5511999999999",
      },
      site: {
        heroImageUrl: "https://cdn.local/hero.jpg",
        layoutKey: "default",
        seoDescription: "Estoque selecionado",
        seoTitle: "Loja Demo",
        theme: {},
      },
      store: {
        id: "store_1",
        name: "Loja Demo",
        publicUrl: "demo.lojaveiculos.com.br",
        slug: "demo",
        tenantId: "tenant_1",
      },
    });
  });

  it("maps visible listing detail with public media", async () => {
    const db = createFakePublicStorefrontDb();
    const repository = createDrizzlePublicStorefrontRepository(db);

    const listing = await repository.findPublicListingDetail({
      listingSlug: "fiat-toro-2023",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(listing).toEqual(
      expect.objectContaining({
        media: [
          {
            altText: "Front photo",
            displayOrder: 0,
            kind: "photo",
            url: "https://cdn.local/front.jpg",
          },
        ],
        slug: "fiat-toro-2023",
      }),
    );
    expect(db.queriedTables).toEqual([vehicleListings, vehicleMedia]);
  });
});
