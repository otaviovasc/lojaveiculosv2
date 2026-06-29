import { describe, expect, it } from "vitest";
import {
  applyStorefrontTemplate,
  createStorefrontTheme,
  normalizeStorefrontTemplateKey,
} from "./storefrontTemplates";

describe("storefront templates", () => {
  it("normalizes legacy layout keys to the classic template", () => {
    expect(normalizeStorefrontTemplateKey("default")).toBe("classic");
    expect(normalizeStorefrontTemplateKey("compact")).toBe("classic");
  });

  it("keeps showroom as the visual template", () => {
    expect(normalizeStorefrontTemplateKey("showroom")).toBe("showroom");
  });

  it("keeps copied website builder template keys", () => {
    expect(normalizeStorefrontTemplateKey("aurora")).toBe("aurora");
    expect(normalizeStorefrontTemplateKey("quadra")).toBe("quadra");
  });

  it("creates a complete theme from partial persisted settings", () => {
    const theme = createStorefrontTheme({ headline: "Minha loja" }, "aurora");

    expect(theme).toMatchObject({
      ctaLabel: "Chamar no WhatsApp",
      headline: "Minha loja",
      tone: "premium",
    });
    expect(theme.sections).toContain("featured");
  });

  it("applies the selected template defaults", () => {
    const theme = applyStorefrontTemplate(
      { headline: "Texto antigo", sections: ["contact"] },
      "classic",
    );

    expect(theme.headline).toBe("Estoque completo com atendimento direto");
    expect(theme.sections).toEqual(["featured", "trust", "contact"]);
  });
});
