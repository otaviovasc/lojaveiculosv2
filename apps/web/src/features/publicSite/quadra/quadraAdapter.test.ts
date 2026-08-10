import { describe, expect, it } from "vitest";
import { publicStorefrontPreview } from "../fixtures";
import type { PublicStorefrontPageData } from "../types";
import { adaptQuadraStorefront, quadraListingMedia } from "./quadraAdapter";

describe("adaptQuadraStorefront", () => {
  it("prefers V2 camelCase config and keeps V1 raw-theme fallbacks", () => {
    const data = withTheme({
      heroBannerUrls: ["https://cdn.test/new-banner.jpg"],
      heroTitle: "Título V2",
      hero_banners: ["https://cdn.test/legacy-banner.jpg"],
      hero_subtitle: "Subtítulo legado",
      hero_template: "banner",
      instagram_url: "https://instagram.com/loja-legada",
      logo_url: "https://cdn.test/logo.svg",
      logo_width: 180,
      testimonials: [
        {
          descricao: "Atendimento excelente",
          id: 7,
          imagem_url: "https://cdn.test/cliente.jpg",
          titulo: "Cliente V1",
        },
      ],
      texto_cabecalho_ofertas: "Título legado",
    });

    const model = adaptQuadraStorefront(data);

    expect(model.hero.title).toBe("Título V2");
    expect(model.hero.subtitle).toBe("Subtítulo legado");
    expect(model.hero.bannerUrls).toEqual(["https://cdn.test/new-banner.jpg"]);
    expect(model.hero.mediaSource).toBe("banners");
    expect(model.logoUrl).toBe("https://cdn.test/logo.svg");
    expect(model.logoWidth).toBe(180);
    expect(model.contact.instagramUrl).toBe(
      "https://instagram.com/loja-legada",
    );
    expect(model.testimonials).toEqual([
      {
        id: "7",
        imageUrl: "https://cdn.test/cliente.jpg",
        name: "Cliente V1",
        quote: "Atendimento excelente",
        role: "Cliente",
      },
    ]);
  });

  it("prefers the public V2 profile address and hours over theme fallbacks", () => {
    const data = withTheme({
      business_hours: "Horario legado",
      contact: { address: "Endereco legado" },
    });

    const model = adaptQuadraStorefront(data);

    expect(model.contact.address).toBe(
      "Avenida Paulista, 1000, Bela Vista, Sao Paulo - SP, 01310-100",
    );
    expect(model.contact.businessHours).toBe("Segunda a sexta, 9h as 18h");
  });

  it("formats keyed V2 business hours for the classic contact section", () => {
    const data = {
      ...withTheme({}),
      settings: {
        ...withTheme({}).settings,
        contact: {
          ...publicStorefrontPreview.settings.contact,
          businessHours: {
            monday: { close: "18:00", open: "09:00" },
            saturday: "09:00 - 13:00",
          },
        },
      },
    } satisfies PublicStorefrontPageData;

    expect(adaptQuadraStorefront(data).contact.businessHours).toBe(
      "Segunda: 09:00 - 18:00\nSabado: 09:00 - 13:00",
    );
  });

  it("keeps legacy contact fallbacks when the V2 profile is empty", () => {
    const themed = withTheme({
      business_hours: "Segunda a sexta, 8h as 17h",
      contact: { address: "Rua Legada, 50" },
    });
    const data = {
      ...themed,
      settings: {
        ...themed.settings,
        contact: {
          ...publicStorefrontPreview.settings.contact,
          addressCity: null,
          addressLine1: null,
          addressLine2: null,
          addressState: null,
          addressZipCode: null,
          businessHours: {},
          city: null,
        },
      },
    } satisfies PublicStorefrontPageData;

    const contact = adaptQuadraStorefront(data).contact;
    expect(contact.address).toBe("Rua Legada, 50");
    expect(contact.businessHours).toBe("Segunda a sexta, 8h as 17h");
  });

  it("uses the canonical vehicle-first hero resolver semantics", () => {
    const base = withTheme({
      heroBannerUrls: ["https://cdn.test/banner.jpg"],
      heroMediaSource: "vehicles",
    });
    const firstListing = base.listings[0]!;
    const data = {
      ...base,
      listings: [
        {
          ...firstListing,
          heroMedia: {
            altText: "Vídeo do veículo",
            displayOrder: 0,
            kind: "video" as const,
            unitColorName: null,
            unitId: "unit-1",
            url: "https://cdn.test/vehicle.mp4",
          },
        },
        ...base.listings.slice(1),
      ],
    } satisfies PublicStorefrontPageData;

    const model = adaptQuadraStorefront(data);

    expect(model.hero.imageKind).toBe("video");
    expect(model.hero.imageUrl).toBe("https://cdn.test/vehicle.mp4");
    expect(model.hero.bannerUrls).toEqual([]);
  });

  it("keeps the V1 hero image in the split hero unless banner mode is configured", () => {
    const base = withTheme({ heroMediaSource: "auto" });
    const data = {
      ...base,
      settings: {
        ...base.settings,
        site: {
          ...base.settings.site,
          heroImageUrl: "https://cdn.test/classic-hero.jpg",
        },
      },
    } satisfies PublicStorefrontPageData;

    const model = adaptQuadraStorefront(data);

    expect(model.hero.imageUrl).toBe("https://cdn.test/classic-hero.jpg");
    expect(model.hero.bannerUrls).toEqual([]);
  });
});

describe("quadraListingMedia", () => {
  it("uses summary media first and deduplicates hero/thumbnail fallbacks", () => {
    const listing = {
      ...publicStorefrontPreview.listings[0]!,
      heroMedia: {
        altText: "Frente",
        displayOrder: 0,
        kind: "photo" as const,
        unitColorName: null,
        unitId: "unit-1",
        url: "https://cdn.test/front.jpg",
      },
      media: [
        {
          altText: "Frente",
          displayOrder: 0,
          kind: "photo" as const,
          unitColorName: null,
          unitId: "unit-1",
          url: "https://cdn.test/front.jpg",
        },
        {
          altText: "Traseira",
          displayOrder: 1,
          kind: "photo" as const,
          unitColorName: null,
          unitId: "unit-1",
          url: "https://cdn.test/rear.jpg",
        },
      ],
      thumbnailUrl: "https://cdn.test/front.jpg",
    };

    expect(quadraListingMedia(listing).map((item) => item.url)).toEqual([
      "https://cdn.test/front.jpg",
      "https://cdn.test/rear.jpg",
    ]);
  });
});

function withTheme(theme: Record<string, unknown>): PublicStorefrontPageData {
  return {
    ...publicStorefrontPreview,
    settings: {
      ...publicStorefrontPreview.settings,
      site: {
        ...publicStorefrontPreview.settings.site,
        heroImageUrl: null,
        layoutKey: "quadra",
        seoDescription: null,
        theme,
      },
    },
  };
}
