import type { CSSProperties } from "react";
import {
  DEFAULT_STOREFRONT_BODY_FONT,
  DEFAULT_STOREFRONT_HEADING_FONT,
  fontStack,
} from "./storefrontFonts";
import type { PublicVehicleListing } from "./types";

export type VisibleStorefrontSection = {
  id: string;
  order: number;
  type: string;
};

type WebsiteBuilderSectionRecord = VisibleStorefrontSection & {
  visible: boolean;
};

export function createStorefrontStyle(
  theme: Record<string, unknown>,
  fonts: { body: string; heading: string },
) {
  const accentColor = readString(theme.accentColor);
  const brandColor = readString(theme.brandColor) ?? accentColor;
  const backgroundColor = readString(theme.backgroundColor);
  const style: CSSProperties & Record<`--${string}`, string> = {
    "--public-storefront-heading-font": fontStack(fonts.heading),
    fontFamily: fontStack(fonts.body),
  };

  if (accentColor) {
    style["--color-accent"] = accentColor;
    style["--color-accent-soft"] =
      `color-mix(in oklab, ${accentColor} 12%, transparent)`;
    style["--color-inverse"] = readableTextColorForBackground(accentColor);
  }
  if (brandColor) style["--color-accent-strong"] = brandColor;
  if (backgroundColor) style.backgroundColor = backgroundColor;

  return style;
}

export function createVisibleSections(
  value: unknown,
  fallbackSections: readonly string[],
): VisibleStorefrontSection[] {
  if (Array.isArray(value) && value.some(isWebsiteBuilderSection)) {
    const sections = value
      .filter(isWebsiteBuilderSection)
      .filter((section) => section.visible)
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        order: section.order,
        type: section.type,
      }));
    const hero = sections.find((section) => section.type === "hero");
    const hasHeroRecord = value
      .filter(isWebsiteBuilderSection)
      .some((section) => section.type === "hero");
    if (hero) {
      return [
        { ...hero, order: 0 },
        ...sections
          .filter((section) => section.type !== "hero")
          .map((section, order) => ({ ...section, order: order + 1 })),
      ];
    }
    return hasHeroRecord
      ? sections
      : [{ id: "hero_0", order: 0, type: "hero" }, ...sections];
  }

  return ["hero", ...fallbackSections].map((type, order) => ({
    id: `${type}_${order}`,
    order,
    type,
  }));
}

export function readThemeFonts(theme: Record<string, unknown>) {
  const fonts = toRecord(theme.fonts);
  return {
    body:
      readString(fonts.body) ??
      readString(theme.bodyFont) ??
      DEFAULT_STOREFRONT_BODY_FONT,
    heading:
      readString(fonts.heading) ??
      readString(theme.headingFont) ??
      DEFAULT_STOREFRONT_HEADING_FONT,
  };
}

export function readTestimonials(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map(toRecord)
    .filter(
      (testimonial) =>
        readString(testimonial.id) &&
        readString(testimonial.name) &&
        readString(testimonial.quote) &&
        readString(testimonial.role),
    )
    .map((testimonial) => ({
      id: readString(testimonial.id) as string,
      imageSrc: readString(testimonial.imageSrc),
      name: readString(testimonial.name) as string,
      quote: readString(testimonial.quote) as string,
      role: readString(testimonial.role) as string,
    }));
}

export function searchListings(
  listings: readonly PublicVehicleListing[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return listings;
  return listings.filter((listing) =>
    [listing.title, listing.description ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}

export function stockEyebrow(type: string) {
  if (type === "search") return "Busca";
  if (type === "all_properties") return "Todos os veículos";
  return "Destaques";
}

export function stockTitle(type: string) {
  if (type === "search") return "Encontre por modelo";
  if (type === "all_properties") return "Estoque completo";
  return "Estoque em destaque";
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readableTextColorForBackground(color: string | null) {
  const rgb = parseHexColor(color);
  if (!rgb) return "var(--public-accent-foreground-light)";
  const whiteContrast = contrastRatio({ blue: 255, green: 255, red: 255 }, rgb);
  const blackContrast = contrastRatio({ blue: 17, green: 24, red: 39 }, rgb);
  return blackContrast > whiteContrast
    ? "var(--public-accent-foreground-dark)"
    : "var(--public-accent-foreground-light)";
}

function isWebsiteBuilderSection(
  value: unknown,
): value is WebsiteBuilderSectionRecord {
  const section = toRecord(value);
  return (
    typeof section.id === "string" &&
    typeof section.type === "string" &&
    typeof section.visible === "boolean" &&
    typeof section.order === "number"
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function contrastRatio(
  foreground: { blue: number; green: number; red: number },
  background: { blue: number; green: number; red: number },
) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance({
  blue,
  green,
  red,
}: {
  blue: number;
  green: number;
  red: number;
}) {
  const channel = (value: number) => {
    const next = value / 255;
    return next <= 0.03928 ? next / 12.92 : ((next + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  );
}

function parseHexColor(color: string | null | undefined) {
  if (!color?.startsWith("#")) return null;
  const hex = color.slice(1);
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((part) => part + part)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    blue: Number.parseInt(normalized.slice(4, 6), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    red: Number.parseInt(normalized.slice(0, 2), 16),
  };
}
