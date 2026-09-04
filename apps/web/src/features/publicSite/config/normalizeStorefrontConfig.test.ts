import { describe, expect, it } from "vitest";
import {
  normalizeStorefrontConfig,
  normalizeStorefrontPresetKey,
} from "./normalizeStorefrontConfig";

const hex = (value: string) => `#${value}`;

describe("normalizeStorefrontPresetKey", () => {
  it("maps the legacy default and unknown keys to aurora", () => {
    expect(normalizeStorefrontPresetKey("default")).toBe("aurora");
    expect(normalizeStorefrontPresetKey("compact")).toBe("aurora");
    expect(normalizeStorefrontPresetKey(null)).toBe("aurora");
    expect(normalizeStorefrontPresetKey("aurora")).toBe("aurora");
  });

  it("maps showroom and classic to quadra", () => {
    expect(normalizeStorefrontPresetKey("showroom")).toBe("quadra");
    expect(normalizeStorefrontPresetKey("classic")).toBe("quadra");
    expect(normalizeStorefrontPresetKey("quadra")).toBe("quadra");
  });

  it("falls back to the legacy templateId theme key when the layout key is missing", () => {
    expect(normalizeStorefrontPresetKey(null, { templateId: "quadra" })).toBe(
      "quadra",
    );
    expect(
      normalizeStorefrontPresetKey("default", { templateId: "showroom" }),
    ).toBe("quadra");
  });
});

describe("normalizeStorefrontConfig", () => {
  it("produces a total v1 config from an empty theme", () => {
    const config = normalizeStorefrontConfig({}, "default");

    expect(config.configVersion).toBe(1);
    expect(config.preset).toBe("aurora");
    expect(config.tokens.color.accent).toBe(hex("C9A84C"));
    expect(config.tokens.color.chrome).toBe("dark");
    expect(config.tokens.type.bodyFont).toBe("Inter");
    expect(config.tokens.type.headingFont).toBe("Bricolage Grotesque");
    expect(config.copy.hero.headline).toBe(
      "Veículos selecionados para compra segura",
    );
    expect(config.sections.map((section) => section.type)).toEqual([
      "header",
      "hero",
      "stock",
      "about",
      "testimonials",
      "lead",
      "footer",
    ]);
    expect(
      config.sections.find((section) => section.type === "stock")?.variant,
    ).toBe("featured-large");
  });

  it("uses the quadra preset defaults, including its section order", () => {
    const config = normalizeStorefrontConfig({}, "classic");

    expect(config.preset).toBe("quadra");
    expect(config.tokens.color.chrome).toBe("light");
    expect(config.tokens.motion.style).toBe("subtle");
    expect(config.copy.hero.headline).toBe(
      "Estoque completo com atendimento direto",
    );
    expect(config.sections.map((section) => section.type)).toEqual([
      "header",
      "hero",
      "stock",
      "testimonials",
      "about",
      "lead",
      "footer",
    ]);
  });

  it("maps legacy copy keys with heroTitle winning over headline", () => {
    const config = normalizeStorefrontConfig(
      {
        badgeLabel: "Selo da loja",
        ctaLabel: "Falar com vendedor",
        headline: "Headline antigo",
        heroTitle: "Título do hero",
      },
      "aurora",
    );

    expect(config.copy.hero.headline).toBe("Título do hero");
    expect(config.copy.hero.badgeLabel).toBe("Selo da loja");
    expect(config.copy.hero.ctaLabel).toBe("Falar com vendedor");
    expect(config.copy.lead.ctaLabel).toBe("Falar com vendedor");
  });

  it("reads headline when heroTitle is absent", () => {
    const config = normalizeStorefrontConfig(
      { headline: "Só headline" },
      "aurora",
    );

    expect(config.copy.hero.headline).toBe("Só headline");
  });

  it("maps legacy color and brand keys into tokens", () => {
    const config = normalizeStorefrontConfig(
      {
        accentColor: hex("123456"),
        backgroundColor: hex("fafafa"),
        brandColor: hex("0f0f0f"),
        corretorCreci: "CRECI 1234",
        corretorName: "Loja do Zé",
        corretorPhotoUrl: "https://cdn.example.com/foto.png",
        logoUrl: "https://cdn.example.com/logo.png",
      },
      "aurora",
    );

    expect(config.tokens.color.accent).toBe(hex("123456"));
    expect(config.tokens.color.accentStrong).toBe(hex("0f0f0f"));
    expect(config.tokens.color.surface).toBe(hex("fafafa"));
    expect(config.tokens.brand.displayName).toBe("Loja do Zé");
    expect(config.tokens.brand.displayLine).toBe("CRECI 1234");
    expect(config.tokens.brand.logoUrl).toBe(
      "https://cdn.example.com/logo.png",
    );
    expect(config.tokens.brand.photoUrl).toBe(
      "https://cdn.example.com/foto.png",
    );
  });

  it("maps all legacy favicon key variants", () => {
    for (const key of [
      "faviconUrl",
      "favicon_url",
      "logoIconUrl",
      "logo_icon_url",
    ]) {
      const config = normalizeStorefrontConfig(
        { [key]: "https://cdn.example.com/favicon.ico" },
        "aurora",
      );
      expect(config.tokens.brand.faviconUrl).toBe(
        "https://cdn.example.com/favicon.ico",
      );
    }
  });

  it("reads fonts from the fonts record with flat key fallbacks", () => {
    const fromRecord = normalizeStorefrontConfig(
      { bodyFont: "Inter", fonts: { heading: "Space Grotesk" } },
      "aurora",
    );
    expect(fromRecord.tokens.type.headingFont).toBe("Space Grotesk");
    expect(fromRecord.tokens.type.bodyFont).toBe("Inter");

    const fromFlatKeys = normalizeStorefrontConfig(
      { bodyFont: "DM Sans", headingFont: "Poppins" },
      "aurora",
    );
    expect(fromFlatKeys.tokens.type.bodyFont).toBe("DM Sans");
    expect(fromFlatKeys.tokens.type.headingFont).toBe("Poppins");
  });

  it("maps website builder section records to v1 specs", () => {
    const config = normalizeStorefrontConfig(
      {
        sections: [
          { id: "hero", order: 2, type: "hero", visible: true },
          { id: "featured", order: 0, type: "featured", visible: true },
          { id: "trust", order: 1, type: "trust", visible: true },
          { id: "contact", order: 3, type: "contact", visible: true },
          { id: "about", order: 4, type: "about", visible: false },
        ],
      },
      "aurora",
    );

    expect(
      config.sections.map((section) => [section.type, section.variant]),
    ).toEqual([
      ["header", "standard"],
      ["hero", "standard"],
      ["stock", "featured"],
      ["lead", "standard"],
      ["about", "standard"],
      ["footer", "standard"],
    ]);
    expect(
      config.sections.find((section) => section.type === "about")?.visible,
    ).toBe(false);
  });

  it("keeps a hidden hero hidden but still locks header and footer", () => {
    const config = normalizeStorefrontConfig(
      {
        sections: [
          { id: "featured", order: 0, type: "featured", visible: true },
          { id: "hero", order: 1, type: "hero", visible: false },
        ],
      },
      "aurora",
    );

    expect(
      config.sections
        .filter((section) => section.visible)
        .map((section) => section.type),
    ).toEqual(["header", "stock", "footer"]);
  });

  it("restores the hero when no hero record exists", () => {
    const config = normalizeStorefrontConfig(
      {
        sections: [
          { id: "featured", order: 0, type: "featured", visible: true },
        ],
      },
      "aurora",
    );

    expect(config.sections.map((section) => section.type)).toEqual([
      "header",
      "hero",
      "stock",
      "footer",
    ]);
  });

  it("maps legacy string section arrays with the hero first", () => {
    const config = normalizeStorefrontConfig(
      { sections: ["featured", "trust", "contact"] },
      "aurora",
    );

    expect(
      config.sections.map((section) => [section.type, section.variant]),
    ).toEqual([
      ["header", "standard"],
      ["hero", "standard"],
      ["stock", "featured"],
      ["lead", "standard"],
      ["footer", "standard"],
    ]);
  });

  it("maps every stock section flavor to the stock type", () => {
    const config = normalizeStorefrontConfig(
      { sections: ["featured", "search", "all_properties"] },
      "aurora",
    );
    const stockSpecs = config.sections.filter(
      (section) => section.type === "stock",
    );

    expect(stockSpecs.map((section) => section.variant)).toEqual([
      "featured",
      "search",
      "all_properties",
    ]);
  });
});
