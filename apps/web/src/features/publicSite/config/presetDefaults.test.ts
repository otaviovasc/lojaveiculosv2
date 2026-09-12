import { describe, expect, it } from "vitest";
import {
  storefrontSectionRegistry,
  resolveSectionVariant,
} from "../sections/registry";
import { storefrontPresetDefaults } from "./presetDefaults";
import type { StorefrontPresetKey } from "./types";

const presetKeys: readonly StorefrontPresetKey[] = ["aurora", "quadra"];

describe("storefront preset defaults", () => {
  it("references only variants registered in the section registry", () => {
    for (const key of presetKeys) {
      const preset = storefrontPresetDefaults[key];
      for (const section of preset.sections) {
        const definition = storefrontSectionRegistry[section.type];
        expect(
          definition.variants,
          `${key}.${section.type} variant "${section.variant}"`,
        ).toContain(section.variant);
        expect(resolveSectionVariant(definition, section.variant)).toBe(
          section.variant,
        );
      }
    }
  });

  it("keeps header, hero, and footer as required visible sections", () => {
    for (const key of presetKeys) {
      const preset = storefrontPresetDefaults[key];
      for (const type of ["header", "hero", "footer"] as const) {
        const section = preset.sections.find((item) => item.type === type);
        expect(section, `${key}.${type}`).toBeDefined();
        expect(section?.visible).toBe(true);
      }
    }
  });

  it("encodes the aurora dark cinematic identity", () => {
    const aurora = storefrontPresetDefaults.aurora;

    expect(aurora.chrome).toBe("dark");
    expect(aurora.scale).toBe("display");
    expect(aurora.radius).toBe("pill");
    expect(aurora.density).toBe("airy");
    expect(aurora.motion).toBe("dynamic");
    expect(aurora.sections.map((section) => section.type)).toEqual([
      "header",
      "hero",
      "stock",
      "about",
      "testimonials",
      "lead",
      "footer",
    ]);
    expect(
      aurora.sections.map((section) => [section.type, section.variant]),
    ).toEqual([
      ["header", "overlay"],
      ["hero", "fullscreen"],
      ["stock", "featured-large"],
      ["about", "standard"],
      ["testimonials", "standard"],
      ["lead", "standard"],
      ["footer", "standard"],
    ]);
  });

  it("encodes the quadra light editorial identity", () => {
    const quadra = storefrontPresetDefaults.quadra;

    expect(quadra.chrome).toBe("light");
    expect(quadra.scale).toBe("compact");
    expect(quadra.radius).toBe("sharp");
    expect(quadra.density).toBe("dense");
    expect(quadra.motion).toBe("subtle");
    expect(quadra.sections.map((section) => section.type)).toEqual([
      "header",
      "hero",
      "stock",
      "testimonials",
      "about",
      "lead",
      "footer",
    ]);
    expect(
      quadra.sections.map((section) => [section.type, section.variant]),
    ).toEqual([
      ["header", "opaque"],
      ["hero", "split"],
      ["stock", "grid-compact"],
      ["testimonials", "standard"],
      ["about", "standard"],
      ["lead", "standard"],
      ["footer", "standard"],
    ]);
  });
});
