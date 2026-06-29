import type {
  storeCustomPages,
  storeProfiles,
  storePublicSiteSettings,
  stores,
} from "@lojaveiculosv2/db";
import type {
  StorefrontBuilderBackground,
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontBuilderSeo,
  StorefrontBuilderVehicle,
  StorefrontCustomPage,
  StorefrontPageChrome,
} from "@lojaveiculosv2/shared";
import { defaultStorefrontBuilderConfig } from "@lojaveiculosv2/shared";
import type {
  PublicStorefrontContact,
  PublicStorefrontPublicStore,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type {
  PublicStorefrontCustomPageSnapshot,
  StorefrontPageUpdateInput,
} from "../../../domains/storefront/ports/storefrontPageRepository.js";

export type StorefrontPageRow = typeof storeCustomPages.$inferSelect;
export type StorefrontPageUpdateRecord = Partial<
  typeof storeCustomPages.$inferInsert
>;

export type StorefrontPagePublicRow = {
  page: StorefrontPageRow;
  profile: typeof storeProfiles.$inferSelect | null;
  publicSite: typeof storePublicSiteSettings.$inferSelect;
  store: typeof stores.$inferSelect;
};

export function toStorefrontCustomPage(
  row: StorefrontPageRow,
): StorefrontCustomPage {
  return {
    accentColor: row.accentColor,
    backgroundColor: row.backgroundColor,
    components: toComponents(row.components),
    description: row.description,
    fontFamily: row.fontFamily,
    id: row.id,
    order: row.displayOrder,
    pageBackground: toBackground(row.pageBackground),
    pageChrome: toObject<StorefrontPageChrome>(row.pageChrome),
    previewUrl: `/p/${row.slug}?token=${row.secretToken}`,
    publicUrl: `/p/${row.slug}`,
    secretToken: row.secretToken,
    seo: toObject<StorefrontBuilderSeo>(row.seo),
    slug: row.slug,
    title: row.title,
    visible: row.isPublished,
  };
}

export function toStorefrontPageUpdate(
  input: StorefrontPageUpdateInput,
): StorefrontPageUpdateRecord {
  return {
    ...(input.accentColor !== undefined
      ? { accentColor: input.accentColor }
      : {}),
    ...(input.backgroundColor !== undefined
      ? { backgroundColor: input.backgroundColor }
      : {}),
    ...(input.components !== undefined ? { components: input.components } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.fontFamily !== undefined ? { fontFamily: input.fontFamily } : {}),
    ...(input.order !== undefined ? { displayOrder: input.order } : {}),
    ...(input.pageBackground !== undefined
      ? { pageBackground: input.pageBackground ?? {} }
      : {}),
    ...(input.pageChrome !== undefined
      ? { pageChrome: input.pageChrome ?? {} }
      : {}),
    ...(input.seo !== undefined ? { seo: input.seo ?? {} } : {}),
    ...(input.slug !== undefined ? { slug: input.slug } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.visible !== undefined ? { isPublished: input.visible } : {}),
  };
}

export function toPublicCustomPageSnapshot(
  row: StorefrontPagePublicRow,
  vehicles: readonly StorefrontBuilderVehicle[],
): PublicStorefrontCustomPageSnapshot {
  return {
    config: toBuilderConfig(row),
    contact: toContact(row.profile),
    page: toStorefrontCustomPage(row.page),
    sitePublished: row.publicSite.isPublished,
    store: toPublicStore(row),
    vehicles,
  };
}

function toBuilderConfig(
  row: StorefrontPagePublicRow,
): StorefrontBuilderConfig {
  const theme = toRecord(row.publicSite.theme);
  const socialLinks = toRecord(theme.socialLinks);
  return {
    accentColor:
      stringValue(theme.accentColor) ??
      row.page.accentColor ??
      defaultStorefrontBuilderConfig.accentColor,
    backgroundColor:
      stringValue(theme.backgroundColor) ??
      row.page.backgroundColor ??
      defaultStorefrontBuilderConfig.backgroundColor,
    contact: {
      address: formatAddress(row.profile),
      email: row.profile?.contactEmail ?? null,
      phone: row.profile?.contactPhone ?? null,
      whatsapp: row.profile?.whatsappPhone ?? null,
    },
    fonts: {
      body:
        stringValue(theme.bodyFont) ??
        defaultStorefrontBuilderConfig.fonts.body,
      heading:
        stringValue(theme.headingFont) ??
        defaultStorefrontBuilderConfig.fonts.heading,
    },
    heroImageUrl: row.publicSite.heroImageUrl,
    logoUrl: row.profile?.logoImageUrl ?? stringValue(theme.logoUrl) ?? null,
    socialLinks: {
      facebook: stringValue(socialLinks.facebook),
      instagram: stringValue(socialLinks.instagram),
      tiktok: stringValue(socialLinks.tiktok),
      whatsapp: row.profile?.whatsappPhone ?? stringValue(socialLinks.whatsapp),
      youtube: stringValue(socialLinks.youtube),
    },
    storeName: row.store.tradingName,
    templateId: row.publicSite.layoutKey,
  };
}

function toContact(
  profile: typeof storeProfiles.$inferSelect | null,
): PublicStorefrontContact {
  const whatsappPhone = profile?.whatsappPhone ?? null;
  return {
    city: profile?.addressCity ?? null,
    contactEmail: profile?.contactEmail ?? null,
    contactPhone: profile?.contactPhone ?? null,
    whatsappPhone,
    whatsappUrl: whatsappPhone ? createWhatsappUrl(whatsappPhone) : null,
  };
}

function toPublicStore(
  row: StorefrontPagePublicRow,
): PublicStorefrontPublicStore & { id: never; tenantId: never } {
  return {
    id: row.store.id as never,
    name: row.store.tradingName,
    publicUrl:
      row.publicSite.customDomain ??
      `${row.store.publicSlug}.lojaveiculos.com.br`,
    slug: row.store.publicSlug,
    tenantId: row.store.tenantId as never,
  };
}

function toComponents(value: unknown): StorefrontBuilderComponent[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record = toRecord(item);
    return {
      id: stringValue(record.id) ?? `component-${index}`,
      order: numberValue(record.order) ?? index,
      props: toRecord(record.props),
      type: stringValue(record.type) ?? "text_block",
      visible: record.visible !== false,
    };
  });
}

function toBackground(value: unknown): StorefrontBuilderBackground | null {
  const record = toRecord(value);
  return stringValue(record.type)
    ? (record as StorefrontBuilderBackground)
    : null;
}

function toObject<T extends Record<string, unknown>>(value: unknown): T | null {
  const record = toRecord(value);
  return Object.keys(record).length > 0 ? (record as T) : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatAddress(profile: typeof storeProfiles.$inferSelect | null) {
  if (!profile) return null;
  const parts = [
    profile.addressLine1,
    profile.addressLine2,
    profile.addressCity,
    profile.addressState,
    profile.addressZipCode,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function createWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}
