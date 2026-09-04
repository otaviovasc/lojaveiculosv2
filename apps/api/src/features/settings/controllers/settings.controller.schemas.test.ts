import { describe, expect, it } from "vitest";
import {
  normalizeStorefrontLayoutKey,
  publicSiteThemeSchema,
  updateStoreSettingsSchema,
} from "./settings.controller.schemas.js";

const fullStorefrontTheme = {
  configVersion: 1,
  copy: {
    hero: {
      badgeLabel: "Seminovos",
      ctaLabel: "Ver estoque",
      headline: "Seu próximo carro",
    },
    lead: { ctaLabel: "Falar com a loja" },
  },
  preset: "aurora",
  sections: [
    { id: "header", type: "header", variant: "standard", visible: true },
    { id: "hero", type: "hero", variant: "standard", visible: true },
    { id: "stock_1", order: 1, type: "featured", visible: true },
  ],
  tokens: {
    brand: {
      displayLine: "CRECI 12345",
      displayName: "João Corretor",
      faviconUrl: "https://cdn.example.com/favicon.ico",
      logoUrl: "https://cdn.example.com/logo.png",
      photoUrl: null,
    },
    color: {
      accent: "#ff6600",
      accentStrong: "#cc5200",
      chrome: "brand",
      ink: "#151515",
      inkMuted: "#666666",
      surface: "#ffffff",
      surfaceRaised: "#fafafa",
    },
    motion: { style: "subtle" },
    shape: { density: "default", radius: "rounded" },
    type: { bodyFont: "Inter", headingFont: "Sora", scale: "standard" },
  },
};

describe("publicSiteThemeSchema", () => {
  it("accepts a full versioned storefront config", () => {
    const parsed = publicSiteThemeSchema.safeParse(fullStorefrontTheme);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ configVersion: 1, preset: "aurora" });
  });

  it("accepts legacy flat theme keys", () => {
    const parsed = publicSiteThemeSchema.safeParse({
      aboutText: "Há 20 anos no mercado.",
      aboutTitle: "Sobre nós",
      accentColor: "#f60",
      backgroundColor: "#ffffff",
      badgeLabel: "Ofertas",
      brandColor: "#ff6600",
      contact: { phone: "+55 11 90000-0000" },
      corretorCreci: "12345-F",
      corretorName: "João",
      corretorPhotoUrl: "https://cdn.example.com/joao.png",
      ctaLabel: "Comprar",
      faviconUrl: "https://cdn.example.com/favicon.ico",
      fonts: { body: "Inter", heading: "Sora" },
      heroBannerUrls: ["https://cdn.example.com/banner-1.jpg"],
      heroMediaSource: "banners",
      heroSubtitle: "Os melhores seminovos da região.",
      heroTitle: "Loja Exemplo",
      logoUrl: "https://cdn.example.com/logo.png",
      sections: [
        { id: "hero_0", order: 0, type: "hero", visible: true },
        "featured",
      ],
      seo: { metaDescription: "Seminovos de qualidade.", metaTitle: "Loja" },
      socialLinks: { instagram: "https://instagram.com/loja" },
      testimonials: [
        {
          id: "t1",
          name: "Maria",
          quote: "Ótimo atendimento.",
          role: "Cliente",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unknown top-level theme keys", () => {
    const parsed = publicSiteThemeSchema.safeParse({
      heroTitle: "Loja",
      unknownSetting: "nope",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects over-length strings", () => {
    expect(
      publicSiteThemeSchema.safeParse({ heroTitle: "x".repeat(121) }).success,
    ).toBe(false);
    expect(
      publicSiteThemeSchema.safeParse({ heroSubtitle: "x".repeat(501) })
        .success,
    ).toBe(false);
    expect(
      publicSiteThemeSchema.safeParse({
        logoUrl: `https://e.co/${"x".repeat(2048)}`,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid colors", () => {
    expect(
      publicSiteThemeSchema.safeParse({ accentColor: "orange" }).success,
    ).toBe(false);
    expect(
      publicSiteThemeSchema.safeParse({
        tokens: { color: { accent: "#zzzzzz" } },
      }).success,
    ).toBe(false);
  });

  it("rejects section items missing required fields", () => {
    expect(
      publicSiteThemeSchema.safeParse({ sections: [{ id: "x", type: "hero" }] })
        .success,
    ).toBe(false);
  });
});

describe("layoutKey normalization", () => {
  it.each([
    ["aurora", "aurora"],
    ["quadra", "quadra"],
    ["showroom", "quadra"],
    ["classic", "quadra"],
    ["default", "aurora"],
    ["something-else", "aurora"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeStorefrontLayoutKey(input)).toBe(expected);
  });

  it("maps legacy layoutKey values during settings update parsing", () => {
    const parsed = updateStoreSettingsSchema.safeParse({
      publicSite: { layoutKey: "showroom" },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.publicSite?.layoutKey).toBe("quadra");
  });

  it("keeps parsing valid update payloads with a theme", () => {
    const parsed = updateStoreSettingsSchema.safeParse({
      publicSite: {
        isPublished: true,
        layoutKey: "default",
        theme: fullStorefrontTheme,
      },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.publicSite?.layoutKey).toBe("aurora");
  });
});
