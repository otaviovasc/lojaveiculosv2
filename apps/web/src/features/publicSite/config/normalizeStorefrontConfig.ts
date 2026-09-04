import { readString } from "../publicStorefrontTheme";
import {
  DEFAULT_STOREFRONT_BODY_FONT,
  DEFAULT_STOREFRONT_HEADING_FONT,
} from "../storefrontFonts";
import { storefrontPresetDefaults } from "./presetDefaults";
import type {
  SectionCopy,
  SectionSpec,
  SectionType,
  StorefrontConfig,
  StorefrontPresetKey,
} from "./types";

type LegacySectionRecord = {
  id: string;
  order: number;
  type: string;
  visible: boolean;
};

const legacyStockVariants = new Set(["featured", "search", "all_properties"]);

export function normalizeStorefrontPresetKey(
  layoutKey: string | null | undefined,
  rawTheme?: Record<string, unknown>,
): StorefrontPresetKey {
  const candidates = [
    layoutKey ?? null,
    rawTheme ? readString(rawTheme.templateId) : null,
  ];
  for (const candidate of candidates) {
    if (
      candidate === "quadra" ||
      candidate === "showroom" ||
      candidate === "classic"
    ) {
      return "quadra";
    }
    if (candidate === "aurora") return "aurora";
  }
  return "aurora";
}

export function normalizeStorefrontConfig(
  rawTheme: Record<string, unknown>,
  layoutKey: string | null | undefined,
): StorefrontConfig {
  const theme = toRecord(rawTheme);
  const preset = normalizeStorefrontPresetKey(layoutKey, theme);
  const defaults = storefrontPresetDefaults[preset];
  const fonts = toRecord(theme.fonts);

  const badgeLabel =
    readString(theme.badgeLabel) ?? defaults.copy.hero.badgeLabel ?? "";
  const headline =
    readString(theme.heroTitle) ??
    readString(theme.headline) ??
    defaults.copy.hero.headline ??
    "";
  const ctaLabel =
    readString(theme.ctaLabel) ?? defaults.copy.hero.ctaLabel ?? "";

  return {
    configVersion: 1,
    copy: {
      ...cloneCopy(defaults.copy),
      hero: { ...defaults.copy.hero, badgeLabel, ctaLabel, headline },
      lead: { ...defaults.copy.lead, ctaLabel },
    },
    preset,
    sections: normalizeSections(theme.sections, defaults.sections),
    tokens: {
      brand: {
        displayLine: readString(theme.corretorCreci),
        displayName: readString(theme.corretorName),
        faviconUrl:
          readString(theme.faviconUrl) ??
          readString(theme.favicon_url) ??
          readString(theme.logoIconUrl) ??
          readString(theme.logo_icon_url),
        logoUrl: readString(theme.logoUrl),
        photoUrl: readString(theme.corretorPhotoUrl),
      },
      color: {
        accent: readString(theme.accentColor) ?? defaults.accent,
        accentStrong: readString(theme.brandColor) ?? defaults.accentStrong,
        chrome: defaults.chrome,
        ink: defaults.ink,
        inkMuted: defaults.inkMuted,
        surface: readString(theme.backgroundColor) ?? defaults.surface,
        surfaceRaised: defaults.surfaceRaised,
      },
      motion: { style: defaults.motion },
      shape: { density: defaults.density, radius: defaults.radius },
      type: {
        bodyFont:
          readString(fonts.body) ??
          readString(theme.bodyFont) ??
          DEFAULT_STOREFRONT_BODY_FONT,
        headingFont:
          readString(fonts.heading) ??
          readString(theme.headingFont) ??
          DEFAULT_STOREFRONT_HEADING_FONT,
        scale: defaults.scale,
      },
    },
  };
}

function normalizeSections(
  value: unknown,
  fallback: readonly SectionSpec[],
): SectionSpec[] {
  if (Array.isArray(value) && value.some(isLegacySectionRecord)) {
    const records = value
      .filter(isLegacySectionRecord)
      .sort((a, b) => a.order - b.order);
    const mapped = records
      .map((record) => legacyRecordToSpec(record))
      .filter((specItem): specItem is SectionSpec => Boolean(specItem));
    const hasHeroRecord = records.some((record) => record.type === "hero");
    const specs = hasHeroRecord
      ? mapped
      : [createSpec("hero", "standard", true), ...mapped];
    return withRequiredSections(heroFirst(specs));
  }

  if (Array.isArray(value)) {
    const legacyKeys = value.filter(
      (item): item is string =>
        typeof item === "string" && Boolean(item.trim()),
    );
    if (legacyKeys.length) {
      const specs = [
        createSpec("hero", "standard", true),
        ...legacyKeys
          .map((key, index) => legacyKeyToSpec(key, index))
          .filter((specItem): specItem is SectionSpec => Boolean(specItem)),
      ];
      return withRequiredSections(specs);
    }
  }

  return fallback.map((section) => ({ ...section }));
}

function heroFirst(specs: SectionSpec[]) {
  return [
    ...specs.filter((section) => section.type === "hero"),
    ...specs.filter((section) => section.type !== "hero"),
  ];
}

function withRequiredSections(specs: SectionSpec[]) {
  const hasHeader = specs.some((section) => section.type === "header");
  const hasFooter = specs.some((section) => section.type === "footer");
  return [
    ...(hasHeader ? [] : [createSpec("header", "standard", true)]),
    ...specs,
    ...(hasFooter ? [] : [createSpec("footer", "standard", true)]),
  ];
}

function legacyRecordToSpec(record: LegacySectionRecord): SectionSpec | null {
  const mapped = mapLegacySectionType(record.type);
  if (!mapped) return null;
  return {
    id: record.id,
    type: mapped.type,
    variant: mapped.variant,
    visible: record.visible,
  };
}

function legacyKeyToSpec(key: string, index: number): SectionSpec | null {
  const mapped = mapLegacySectionType(key);
  if (!mapped) return null;
  return {
    id: `${mapped.type}_${index}`,
    type: mapped.type,
    variant: mapped.variant,
    visible: true,
  };
}

function mapLegacySectionType(
  type: string,
): { type: SectionType; variant: string } | null {
  if (type === "header" || type === "footer")
    return { type, variant: "standard" };
  if (type === "hero") return { type: "hero", variant: "standard" };
  if (legacyStockVariants.has(type)) return { type: "stock", variant: type };
  if (type === "about") return { type: "about", variant: "standard" };
  if (type === "testimonials")
    return { type: "testimonials", variant: "standard" };
  if (type === "contact") return { type: "lead", variant: "standard" };
  return null;
}

function createSpec(type: SectionType, variant: string, visible: boolean) {
  return { id: type, type, variant, visible };
}

function isLegacySectionRecord(value: unknown): value is LegacySectionRecord {
  const section = toRecord(value);
  return (
    typeof section.id === "string" &&
    typeof section.type === "string" &&
    typeof section.visible === "boolean" &&
    typeof section.order === "number"
  );
}

function cloneCopy(copy: Record<SectionType, SectionCopy>) {
  return Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [key, { ...value }]),
  ) as Record<SectionType, SectionCopy>;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
