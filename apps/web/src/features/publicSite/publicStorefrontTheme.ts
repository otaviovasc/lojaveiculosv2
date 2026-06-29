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
    return value
      .filter(isWebsiteBuilderSection)
      .filter((section) => section.visible)
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        order: section.order,
        type: section.type,
      }));
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
  if (type === "all_properties") return "Todos os veiculos";
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
