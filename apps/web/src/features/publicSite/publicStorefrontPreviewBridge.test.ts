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
      heroSubtitle: "Atendimento direto",
      heroTitle: "Garagem premium",
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
    expect(data.settings.site.seoDescription).toBe("Atendimento direto");
    expect(data.settings.site.theme).toMatchObject({
      accentColor,
      headline: "Garagem premium",
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
});

function createStorefrontData(): PublicStorefrontPageData {
  return {
    listings: [
      {
        description: null,
        manufactureYear: 2024,
        mileageKm: 0,
        modelYear: 2025,
        priceCents: 10000000,
        slug: "carro",
        status: "available",
        thumbnailUrl: null,
        title: "Carro",
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
