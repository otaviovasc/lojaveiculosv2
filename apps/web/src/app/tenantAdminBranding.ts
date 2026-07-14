import type { CSSProperties } from "react";
import type { StoreSettingsSnapshot } from "../features/settings/types";

export const tenantAdminBrandUpdatedEvent =
  "lojaveiculosv2:tenant-admin-brand-updated";

export type TenantAdminBrand = {
  accentColor: string | null;
  accentColorForeground: string | null;
  accentColorSoft: string | null;
  accentColorSoftForeground: string | null;
  accentColorStrong: string | null;
  accentColorStrongForeground: string | null;
  faviconUrl: string | null;
  iconUrl: string | null;
  logoUrl: string | null;
  storeLabel: string;
  storeName: string;
};

export type TenantAdminBrandStyle = CSSProperties &
  Record<`--${string}`, string>;

export function createTenantAdminBrand(
  settings: StoreSettingsSnapshot,
  fallbackStoreLabel = "Loja atual",
): TenantAdminBrand {
  const theme = toRecord(settings.publicSite.theme);
  const accentColor =
    normalizeHexColor(readString(theme.accentColor)) ??
    normalizeHexColor(readString(theme.brandColor)) ??
    null;
  const logoUrl =
    readString(settings.profile.logoImageUrl) ?? readString(theme.logoUrl);
  const faviconUrl =
    readString(theme.faviconUrl) ??
    readString(theme.favicon_url) ??
    readString(theme.logoIconUrl) ??
    readString(theme.logo_icon_url) ??
    null;
  const accentColorSoft = accentColor ? createSoftColor(accentColor) : null;
  const accentColorStrong = accentColor ? createStrongColor(accentColor) : null;

  return {
    accentColor,
    accentColorForeground: accentColor
      ? createReadableTextColor(accentColor)
      : null,
    accentColorSoft,
    accentColorSoftForeground: accentColorSoft
      ? createReadableTextColor(accentColorSoft)
      : null,
    accentColorStrong,
    accentColorStrongForeground: accentColorStrong
      ? createReadableTextColor(accentColorStrong)
      : null,
    faviconUrl,
    iconUrl: faviconUrl ?? logoUrl,
    logoUrl,
    storeLabel: settings.identity.publicSlug || fallbackStoreLabel,
    storeName:
      readString(theme.corretorName) ??
      settings.identity.tradingName ??
      "Loja Veiculos",
  };
}

export function createTenantAdminBrandStyle(
  brand: TenantAdminBrand,
): TenantAdminBrandStyle {
  if (
    !brand.accentColor ||
    !brand.accentColorStrong ||
    !brand.accentColorSoft
  ) {
    return {};
  }

  return {
    "--background-image-gradient-brand": `linear-gradient(135deg, ${brand.accentColor}, ${brand.accentColorStrong})`,
    "--color-accent": brand.accentColor,
    "--color-accent-foreground":
      brand.accentColorForeground ?? "var(--color-accent-foreground)",
    "--color-accent-soft": brand.accentColorSoft,
    "--color-accent-soft-foreground":
      brand.accentColorSoftForeground ?? "var(--color-accent-soft-foreground)",
    "--color-accent-strong": brand.accentColorStrong,
    "--color-accent-strong-foreground":
      brand.accentColorStrongForeground ??
      "var(--color-accent-strong-foreground)",
    "--color-brand": brand.accentColor,
    "--color-brand-dark": brand.accentColorStrong,
  };
}

export function notifyTenantAdminBrandUpdated(settings: StoreSettingsSnapshot) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TenantAdminBrandUpdatedDetail>(
      tenantAdminBrandUpdatedEvent,
      {
        detail: { settings },
      },
    ),
  );
}

export type TenantAdminBrandUpdatedDetail = {
  settings: StoreSettingsSnapshot;
};

export function applyTenantAdminFavicon(faviconUrl: string | null) {
  if (typeof document === "undefined") return;

  const existing = document.querySelector<HTMLLinkElement>(
    'link[data-tenant-admin-brand="favicon"]',
  );

  if (!faviconUrl) {
    existing?.remove();
    return;
  }

  const link = existing ?? document.createElement("link");
  link.dataset.tenantAdminBrand = "favicon";
  link.href = faviconUrl;
  link.rel = "icon";
  if (!existing) document.head.append(link);
}

function normalizeHexColor(value: string | null): string | null {
  const match = value?.trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;

  const raw = match[1];
  if (!raw) return null;
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((part) => part + part)
          .join("")
      : raw;

  return `#${expanded.toLowerCase()}`;
}

function createStrongColor(color: string) {
  const rgb = hexToRgb(color);
  const target = relativeLuminance(rgb) < 0.24 ? [255, 255, 255] : [0, 0, 0];
  return rgbToHex(mixRgb(rgb, target, 0.2));
}

function createSoftColor(color: string) {
  return rgbToHex(mixRgb(hexToRgb(color), [255, 255, 255], 0.88));
}

function createReadableTextColor(color: string) {
  const luminance = relativeLuminance(hexToRgb(color));
  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);
  return darkContrast >= lightContrast
    ? rgbToHex([21, 21, 21])
    : rgbToHex([255, 255, 255]);
}

function hexToRgb(color: string): [number, number, number] {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
}

function mixRgb(
  source: readonly [number, number, number],
  target: readonly number[],
  amount: number,
): [number, number, number] {
  return source.map((channel, index) =>
    Math.round(channel + ((target[index] ?? channel) - channel) * amount),
  ) as [number, number, number];
}

function rgbToHex(rgb: readonly number[]) {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance(rgb: readonly number[]) {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
