import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_STOREFRONT_THEME,
  DEFAULT_STOREFRONT_ABOUT_FEATURES,
  DEFAULT_STOREFRONT_ABOUT_IMAGES,
  DEFAULT_STOREFRONT_SECTIONS,
  DEFAULT_STOREFRONT_TESTIMONIALS,
  DEFAULT_STOREFRONT_VEHICLE_IMAGE,
} from "./storefrontTemplateDefaults.js";

describe("storefront template defaults", () => {
  it("keeps the public theme composed from the canonical shared defaults", () => {
    expect(DEFAULT_PUBLIC_STOREFRONT_THEME).toMatchObject({
      appearanceMode: "light",
      heroMediaSource: "vehicles",
      templateId: "quadra",
    });
    expect(DEFAULT_PUBLIC_STOREFRONT_THEME.about.features).toBe(
      DEFAULT_STOREFRONT_ABOUT_FEATURES,
    );
    expect(DEFAULT_PUBLIC_STOREFRONT_THEME.sections).toBe(
      DEFAULT_STOREFRONT_SECTIONS,
    );
    expect(DEFAULT_PUBLIC_STOREFRONT_THEME.testimonials).toBe(
      DEFAULT_STOREFRONT_TESTIMONIALS,
    );
    expect(DEFAULT_PUBLIC_STOREFRONT_THEME.about.image1_url).toBe(
      DEFAULT_STOREFRONT_ABOUT_IMAGES.primary,
    );
    expect(DEFAULT_PUBLIC_STOREFRONT_THEME.about.image2_url).toBe(
      DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary,
    );
  });

  it("keeps section identifiers unique and ordered for rendering", () => {
    const sectionIds = DEFAULT_STOREFRONT_SECTIONS.map(({ id }) => id);
    const sectionOrders = DEFAULT_STOREFRONT_SECTIONS.map(({ order }) => order);

    expect(new Set(sectionIds).size).toBe(sectionIds.length);
    expect(sectionOrders).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(
      DEFAULT_STOREFRONT_SECTIONS.filter(({ visible }) => visible).map(
        ({ id }) => id,
      ),
    ).toEqual(["hero", "featured", "testimonials", "about", "contact"]);
  });

  it("uses stable local assets and testimonial identifiers", () => {
    expect(DEFAULT_STOREFRONT_ABOUT_IMAGES).toEqual({
      primary: "/images/storefront/about-store.webp",
      secondary: "/images/storefront/about-showroom.webp",
    });
    expect(DEFAULT_STOREFRONT_VEHICLE_IMAGE).toBe(
      "/images/storefront/vehicle-photo-pending.webp",
    );
    expect(
      DEFAULT_STOREFRONT_TESTIMONIALS.map(({ id, imageSrc }) => ({
        id,
        imageSrc,
      })),
    ).toEqual([
      { id: "default-testimonial-1", imageSrc: null },
      { id: "default-testimonial-2", imageSrc: null },
      { id: "default-testimonial-3", imageSrc: null },
    ]);
  });
});
