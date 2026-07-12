import { describe, expect, it } from "vitest";
import {
  resolvePublicStorefrontFeaturedListing,
  resolvePublicStorefrontHeroMedia,
} from "./PublicStorefrontHeroMedia";
import type { PublicVehicleListing } from "./types";

describe("resolvePublicStorefrontHeroMedia", () => {
  it("uses configured banner images before vehicle media in auto mode", () => {
    const input = {
      heroImageUrl: "https://cdn.local/legacy-hero.jpg",
      listings: [createListing({ thumbnailUrl: "https://cdn.local/car.jpg" })],
      theme: {
        heroBannerUrls: [
          "https://cdn.local/banner-1.jpg",
          "https://cdn.local/banner-2.jpg",
        ],
        heroMediaSource: "auto",
      },
    };

    expect(resolvePublicStorefrontHeroMedia(input)).toEqual([
      { altText: "", kind: "image", url: "https://cdn.local/banner-1.jpg" },
      { altText: "", kind: "image", url: "https://cdn.local/banner-2.jpg" },
    ]);
    expect(resolvePublicStorefrontFeaturedListing(input)).toBeNull();
  });

  it("selects vehicle video media before vehicle photos", () => {
    expect(
      resolvePublicStorefrontHeroMedia({
        heroImageUrl: "https://cdn.local/banner.jpg",
        listings: [
          createListing({
            heroMedia: {
              altText: "Front photo",
              displayOrder: 0,
              kind: "photo",
              unitColorName: "Preto",
              unitId: "unit_1",
              url: "https://cdn.local/front.jpg",
            },
            slug: "audi-a4",
            title: "Audi A4",
          }),
          createListing({
            heroMedia: {
              altText: "Walkaround",
              displayOrder: 1,
              kind: "video",
              unitColorName: "Preto",
              unitId: "unit_2",
              url: "https://cdn.local/walkaround.mp4",
            },
            slug: "bmw-m3",
            title: "BMW M3",
          }),
        ],
        theme: { heroMediaSource: "vehicles" },
      }),
    ).toEqual([
      {
        altText: "Walkaround",
        kind: "video",
        url: "https://cdn.local/walkaround.mp4",
      },
    ]);

    expect(
      resolvePublicStorefrontFeaturedListing({
        heroImageUrl: "https://cdn.local/banner.jpg",
        listings: [
          createListing({
            heroMedia: {
              altText: "Front photo",
              displayOrder: 0,
              kind: "photo",
              unitColorName: "Preto",
              unitId: "unit_1",
              url: "https://cdn.local/front.jpg",
            },
            slug: "audi-a4",
            title: "Audi A4",
          }),
          createListing({
            heroMedia: {
              altText: "Walkaround",
              displayOrder: 1,
              kind: "video",
              unitColorName: "Preto",
              unitId: "unit_2",
              url: "https://cdn.local/walkaround.mp4",
            },
            slug: "bmw-m3",
            title: "BMW M3",
          }),
        ],
        theme: { heroMediaSource: "vehicles" },
      }),
    ).toMatchObject({ slug: "bmw-m3", title: "BMW M3" });
  });
});

function createListing(
  overrides: Partial<PublicVehicleListing> = {},
): PublicVehicleListing {
  return {
    condition: "used",
    description: null,
    doors: 4,
    engineAspiration: null,
    engineDisplacement: null,
    fuelType: null,
    heroMedia: null,
    manufactureYear: 2024,
    mileageKm: 12000,
    modelYear: 2025,
    priceCents: 10000000,
    slug: "carro",
    status: "available",
    thumbnailUrl: null,
    title: "Carro",
    transmission: null,
    trimName: null,
    ...overrides,
  };
}
