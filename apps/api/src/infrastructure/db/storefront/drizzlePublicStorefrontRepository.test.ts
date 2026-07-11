import { describe, expect, it } from "vitest";
import {
  storePublicSiteSettings,
  stores,
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
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
        condition: "used",
        engineAspiration: "turbo",
        engineDisplacement: "2.0",
        fuelType: "flex",
        slug: "fiat-toro-2023",
        status: "available",
        thumbnailUrl: "https://cdn.local/front.jpg",
        title: "Fiat Toro Volcano 2023",
      }),
    ]);
    expect(listings[0]?.heroMedia?.url).toBe("https://cdn.local/front.jpg");
    expect(db.queriedTables).toEqual([
      stores,
      storePublicSiteSettings,
      vehicleListings,
      vehicleUnits,
      vehicleMedia,
    ]);
  });

  it("keeps certified pre-owned condition in the public listing contract", async () => {
    const db = createFakePublicStorefrontDb({
      listings: [
        {
          condition: "certified_pre_owned",
          description: "Certified stock.",
          doors: 4,
          engineAspiration: "aspirated",
          engineDisplacement: "1.8",
          featuredUntil: null,
          fuelType: "flex",
          listingId: "listing_certified",
          manufactureYear: 2022,
          mileageKm: 18000,
          modelYear: 2023,
          priceCents: 14490000,
          slug: "certified-suv-2023",
          title: "Certified SUV 2023",
          transmission: "automatic",
          trimName: "Exclusive",
        },
      ],
    });
    const repository = createDrizzlePublicStorefrontRepository(db);

    const listings = await repository.listPublicListings({
      limit: 12,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(listings[0]).toEqual(
      expect.objectContaining({
        condition: "certified_pre_owned",
        engineAspiration: "aspirated",
        slug: "certified-suv-2023",
      }),
    );
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
            unitColorName: "Preto",
            unitId: "unit_1",
            url: "https://cdn.local/front.jpg",
          },
        ],
        mediaGroups: [
          {
            colorName: "Preto",
            media: [
              {
                altText: "Front photo",
                displayOrder: 0,
                kind: "photo",
                unitColorName: "Preto",
                unitId: "unit_1",
                url: "https://cdn.local/front.jpg",
              },
            ],
            unitId: "unit_1",
          },
        ],
        slug: "fiat-toro-2023",
      }),
    );
    expect(listing?.heroMedia?.url).toBe("https://cdn.local/front.jpg");
    expect(db.queriedTables).toEqual([
      vehicleListings,
      vehicleUnits,
      vehicleMedia,
    ]);
  });

  it("keeps one listing detail with unit color media groups", async () => {
    const db = createFakePublicStorefrontDb({
      media: [
        {
          altText: "Green front",
          displayOrder: 0,
          kind: "photo",
          unitId: "unit_green",
          url: "https://cdn.local/m3-green-front.jpg",
        },
        {
          altText: "Black front",
          displayOrder: 0,
          kind: "photo",
          unitId: "unit_black",
          url: "https://cdn.local/m3-black-front.jpg",
        },
      ],
      units: [
        {
          colorName: "Verde",
          id: "unit_green",
          status: "available",
          stockNumber: "M3-GREEN",
        },
        {
          colorName: "Preto",
          id: "unit_black",
          status: "available",
          stockNumber: "M3-BLACK",
        },
      ],
    });
    const repository = createDrizzlePublicStorefrontRepository(db);

    const listing = await repository.findPublicListingDetail({
      listingSlug: "fiat-toro-2023",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    });

    expect(listing).toEqual(
      expect.objectContaining({
        media: [
          expect.objectContaining({
            unitColorName: "Preto",
            unitId: "unit_black",
            url: "https://cdn.local/m3-black-front.jpg",
          }),
        ],
        mediaGroups: [
          expect.objectContaining({
            colorName: "Preto",
            media: [
              expect.objectContaining({
                unitId: "unit_black",
                url: "https://cdn.local/m3-black-front.jpg",
              }),
            ],
            unitId: "unit_black",
          }),
          expect.objectContaining({
            colorName: "Verde",
            media: [
              expect.objectContaining({
                unitId: "unit_green",
                url: "https://cdn.local/m3-green-front.jpg",
              }),
            ],
            unitId: "unit_green",
          }),
        ],
      }),
    );
  });
});
