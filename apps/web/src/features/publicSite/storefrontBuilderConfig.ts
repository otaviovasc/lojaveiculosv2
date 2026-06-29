import type { StorefrontBuilderConfig } from "@lojaveiculosv2/shared";
import { defaultStorefrontBuilderConfig } from "@lojaveiculosv2/shared";
import type { StoreSettingsSnapshot } from "../settings/types";

export function createBuilderConfigFromSettings(
  settings: StoreSettingsSnapshot,
): StorefrontBuilderConfig {
  const theme = settings.publicSite.theme;
  const socialLinks = toRecord(theme.socialLinks);
  return {
    accentColor:
      stringValue(theme.accentColor) ??
      defaultStorefrontBuilderConfig.accentColor,
    backgroundColor:
      stringValue(theme.backgroundColor) ??
      defaultStorefrontBuilderConfig.backgroundColor,
    contact: {
      address: formatAddress(settings.profile),
      email: settings.profile.contactEmail,
      phone: settings.profile.contactPhone,
      whatsapp: settings.profile.whatsappPhone,
    },
    fonts: {
      body: stringValue(theme.bodyFont) ?? "Plus Jakarta Sans",
      heading: stringValue(theme.headingFont) ?? "Plus Jakarta Sans",
    },
    heroImageUrl: settings.publicSite.heroImageUrl,
    logoUrl: settings.profile.logoImageUrl ?? stringValue(theme.logoUrl),
    socialLinks: {
      facebook: stringValue(socialLinks.facebook),
      instagram: stringValue(socialLinks.instagram),
      tiktok: stringValue(socialLinks.tiktok),
      whatsapp:
        settings.profile.whatsappPhone ?? stringValue(socialLinks.whatsapp),
      youtube: stringValue(socialLinks.youtube),
    },
    storeName: settings.identity.tradingName,
    templateId: settings.publicSite.layoutKey,
  };
}

function formatAddress(profile: StoreSettingsSnapshot["profile"]) {
  const parts = [
    profile.addressLine1,
    profile.addressLine2,
    profile.addressCity,
    profile.addressState,
    profile.addressZipCode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
