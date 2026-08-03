import type {
  SectionCopy,
  SectionSpec,
  SectionType,
  StorefrontPresetKey,
  StorefrontTokens,
} from "./types";

const hex = (value: string) => `#${value}`;

/**
 * Preset defaults for the two storefront identities. Aurora is the dark
 * cinematic showcase (overlay chrome, display type, fullscreen hero, featured
 * stock); Quadra is the light editorial/utility grid (opaque chrome, compact
 * type, split hero, filter-bar stock). Registered variants must stay in sync
 * with `sections/registry.tsx` — `presetDefaults.test.ts` guards this.
 */
export type StorefrontPresetDefaults = {
  accent: string;
  accentStrong: string;
  chrome: StorefrontTokens["color"]["chrome"];
  copy: Record<SectionType, SectionCopy>;
  density: StorefrontTokens["shape"]["density"];
  ink: string;
  inkMuted: string;
  motion: StorefrontTokens["motion"]["style"];
  radius: StorefrontTokens["shape"]["radius"];
  scale: StorefrontTokens["type"]["scale"];
  sections: readonly SectionSpec[];
  surface: string;
  surfaceRaised: string;
};

function spec(type: SectionType, variant: string, visible = true): SectionSpec {
  return { id: type, type, variant, visible };
}

export const storefrontPresetDefaults: Record<
  StorefrontPresetKey,
  StorefrontPresetDefaults
> = {
  aurora: {
    accent: hex("C9A84C"),
    accentStrong: hex("1A1A1A"),
    chrome: "dark",
    copy: {
      about: {},
      footer: {},
      header: {},
      hero: {
        badgeLabel: "Curadoria da loja",
        ctaLabel: "Chamar no WhatsApp",
        headline: "Veículos selecionados para compra segura",
      },
      lead: {
        ctaLabel: "Chamar no WhatsApp",
        eyebrow: "INTERESSE RÁPIDO",
        title: "Separar veículo",
      },
      stock: {},
      testimonials: {},
    },
    density: "airy",
    ink: hex("151515"),
    inkMuted: hex("4a4444"),
    motion: "dynamic",
    radius: "pill",
    scale: "display",
    sections: [
      spec("header", "overlay"),
      spec("hero", "fullscreen"),
      spec("stock", "featured-large"),
      spec("about", "standard"),
      spec("testimonials", "standard"),
      spec("lead", "standard"),
      spec("footer", "standard"),
    ],
    surface: hex("F8F5F0"),
    surfaceRaised: hex("fff4ee"),
  },
  quadra: {
    accent: hex("C9A84C"),
    accentStrong: hex("1A1A1A"),
    chrome: "light",
    copy: {
      about: {},
      footer: {},
      header: {},
      hero: {
        badgeLabel: "Estoque atualizado",
        ctaLabel: "Tenho interesse",
        headline: "Estoque completo com atendimento direto",
      },
      lead: {
        ctaLabel: "Tenho interesse",
        eyebrow: "FALE COM A LOJA",
        title: "Separar veículo",
      },
      stock: {},
      testimonials: {},
    },
    density: "dense",
    ink: hex("151515"),
    inkMuted: hex("4a4444"),
    motion: "subtle",
    radius: "sharp",
    scale: "compact",
    sections: [
      spec("header", "opaque"),
      spec("hero", "split"),
      spec("stock", "grid-compact"),
      spec("lead", "standard"),
      spec("about", "standard"),
      spec("footer", "standard"),
    ],
    surface: hex("F8F5F0"),
    surfaceRaised: hex("fff4ee"),
  },
};
