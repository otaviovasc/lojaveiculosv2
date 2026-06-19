import { and, eq, isNull, or } from "drizzle-orm";
import {
  storeProfiles,
  storePublicSiteSettings,
  stores,
} from "@lojaveiculosv2/db";
import type {
  PublicStorefrontContact,
  PublicStorefrontSite,
  PublicStorefrontSiteSnapshot,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type {
  DrizzlePublicStorefrontClient,
  PublicSiteRow,
} from "./drizzlePublicStorefrontQueryTypes.js";

export async function findPublicSiteBySlug(
  db: DrizzlePublicStorefrontClient,
  storeSlug: string,
): Promise<PublicStorefrontSiteSnapshot | null> {
  const [row] = await db
    .select({
      addressCity: storeProfiles.addressCity,
      contactEmail: storeProfiles.contactEmail,
      contactPhone: storeProfiles.contactPhone,
      customDomain: storePublicSiteSettings.customDomain,
      heroImageUrl: storePublicSiteSettings.heroImageUrl,
      layoutKey: storePublicSiteSettings.layoutKey,
      name: stores.tradingName,
      seoDescription: storePublicSiteSettings.seoDescription,
      seoTitle: storePublicSiteSettings.seoTitle,
      slug: stores.publicSlug,
      storeId: stores.id,
      tenantId: stores.tenantId,
      theme: storePublicSiteSettings.theme,
      whatsappPhone: storeProfiles.whatsappPhone,
    })
    .from(stores)
    .innerJoin(
      storePublicSiteSettings,
      and(
        eq(storePublicSiteSettings.storeId, stores.id),
        eq(storePublicSiteSettings.isPublished, true),
      ),
    )
    .leftJoin(storeProfiles, eq(storeProfiles.storeId, stores.id))
    .where(
      and(
        createPublicStoreLookupCondition(storeSlug),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    )
    .limit(1);

  return row ? toPublicSiteSnapshot(row) : null;
}

function createPublicStoreLookupCondition(storeLookupKey: string) {
  return or(
    eq(stores.publicSlug, storeLookupKey),
    and(
      eq(storePublicSiteSettings.customDomain, storeLookupKey),
      eq(storePublicSiteSettings.customDomainStatus, "verified"),
    ),
  );
}

function toPublicSiteSnapshot(
  row: PublicSiteRow,
): PublicStorefrontSiteSnapshot {
  return {
    contact: toContact(row),
    site: toSite(row),
    store: {
      id: row.storeId,
      name: row.name,
      publicUrl: row.customDomain ?? `${row.slug}.lojaveiculos.com.br`,
      slug: row.slug,
      tenantId: row.tenantId,
    },
  };
}

function toContact(row: PublicSiteRow): PublicStorefrontContact {
  const whatsappPhone = row.whatsappPhone ?? null;
  return {
    city: row.addressCity,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    whatsappPhone,
    whatsappUrl: whatsappPhone ? createWhatsappUrl(whatsappPhone) : null,
  };
}

function toSite(row: PublicSiteRow): PublicStorefrontSite {
  return {
    heroImageUrl: row.heroImageUrl,
    layoutKey: row.layoutKey,
    seoDescription: row.seoDescription,
    seoTitle: row.seoTitle,
    theme: toRecord(row.theme),
  };
}

function createWhatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
