import { describe, expect, it } from "vitest";
import {
  applyWebsiteBuilderPreviewToStorefrontData,
  mergeWebsiteBuilderPreviewPayload,
} from "./publicStorefrontPreviewBridge";
import type { PublicStorefrontPageData } from "./types";

describe("public storefront preview bridge", () => {
  it("applies website builder draft payloads to public storefront data", () => {
    const accentColor = ["#", "C9A84C"].join("");
    const preview = mergeWebsiteBuilderPreviewPayload(null, {
      accentColor,
      heroBannerUrls: [
        "https://cdn.local/banner-1.jpg",
        "https://cdn.local/banner-2.jpg",
      ],
      heroImageUrl: "https://cdn.local/preview-hero.jpg",
      heroMediaSource: "banners",
      heroSubtitle: "Atendimento direto",
      heroTitle: "Garagem premium",
      logoUrl: "https://cdn.local/logo.png",
      sections: [
        { id: "hero", order: 0, type: "hero", visible: true },
        { id: "featured", order: 1, type: "featured", visible: true },
        { id: "contact", order: 2, type: "contact", visible: true },
      ],
      socialLinks: { whatsapp: "+55 (11) 90000-0000" },
      templateId: "aurora",
    });

    const data = applyWebsiteBuilderPreviewToStorefrontData(
      createStorefrontData(),
      preview,
    );

    expect(data.settings.site.layoutKey).toBe("aurora");
    expect(data.settings.site.heroImageUrl).toBe(
      "https://cdn.local/banner-1.jpg",
    );
    expect(data.settings.site.seoDescription).toBe("Atendimento direto");
    expect(data.settings.site.theme).toMatchObject({
      accentColor,
      heroBannerUrls: [
        "https://cdn.local/banner-1.jpg",
        "https://cdn.local/banner-2.jpg",
      ],
      heroMediaSource: "banners",
      headline: "Garagem premium",
      logoUrl: "https://cdn.local/logo.png",
    });
    expect(data.settings.site.theme.sections).toEqual([
      { id: "hero", order: 0, type: "hero", visible: true },
      { id: "featured", order: 1, type: "featured", visible: true },
      { id: "contact", order: 2, type: "contact", visible: true },
    ]);
    expect(data.settings.contact.whatsappUrl).toBe(
      "https://wa.me/5511900000000",
    );
  });

  it("preserves explicit clears instead of falling back to saved data", () => {
    const saved = createStorefrontData();
    saved.settings.contact.contactEmail = "saved@example.com";
    saved.settings.contact.whatsappPhone = "5511999999999";
    saved.settings.contact.whatsappUrl = "https://wa.me/5511999999999";
    saved.settings.site.heroImageUrl = "https://cdn.local/saved-hero.jpg";
    saved.settings.site.theme = {
      aboutImageUrl: "https://cdn.local/about.jpg",
      logoUrl: "https://cdn.local/logo.png",
    };

    const preview = mergeWebsiteBuilderPreviewPayload(null, {
      aboutImageUrl: null,
      contact: { email: null },
      heroImageUrl: null,
      logoUrl: null,
      socialLinks: { whatsapp: "" },
    });

    const data = applyWebsiteBuilderPreviewToStorefrontData(saved, preview);

    expect(data.settings.site.heroImageUrl).toBeNull();
    expect(data.settings.site.theme).toMatchObject({
      aboutImageUrl: null,
      logoUrl: null,
    });
    expect(data.settings.contact.contactEmail).toBeNull();
    expect(data.settings.contact.whatsappPhone).toBe("");
    expect(data.settings.contact.whatsappUrl).toBeNull();
  });
});

function createStorefrontData(): PublicStorefrontPageData {
  return {
    listings: [
      {
        condition: "new",
        description: null,
        doors: 4,
        engineAspiration: "turbo",
        engineDisplacement: "1.0",
        fuelType: "flex",
        heroMedia: null,
        manufactureYear: 2024,
        mileageKm: 0,
        modelYear: 2025,
        priceCents: 10000000,
        slug: "carro",
        status: "available",
        thumbnailUrl: null,
        title: "Carro",
        transmission: "automatic",
        trimName: "Turbo",
      },
    ],
    settings: {
      contact: {
        city: "Sao Paulo",
        contactEmail: null,
        contactPhone: null,
        whatsappPhone: null,
        whatsappUrl: null,
      },
      site: {
        heroImageUrl: null,
        layoutKey: "classic",
        seoDescription: null,
        seoTitle: null,
        theme: {},
      },
      store: {
        name: "Loja",
        publicUrl: "loja.lojaveiculos.com.br",
        slug: "loja",
      },
    },
    store: {
      name: "Loja",
      slug: "loja",
    },
  };
}
