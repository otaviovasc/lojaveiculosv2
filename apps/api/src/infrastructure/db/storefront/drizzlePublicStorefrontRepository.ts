import { and, asc, eq, isNotNull, isNull, or } from "drizzle-orm";
import {
  storePublicSiteSettings,
  stores,
  vehicleListings,
  vehicleMedia,
} from "@lojaveiculosv2/db";
import type {
  PublicStorefrontRepository,
  PublicVehicleListingDetail,
  PublicVehicleMedia,
  PublicVehicleListing,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type {
  DrizzlePublicStorefrontClient,
  ListingRow,
} from "./drizzlePublicStorefrontQueryTypes.js";
import { findPublicSiteBySlug } from "./drizzlePublicStorefrontSite.js";

export function createDrizzlePublicStorefrontRepository(
  db: DrizzlePublicStorefrontClient,
): PublicStorefrontRepository {
  return {
    findPublicSiteBySlug: (storeSlug) => findPublicSiteBySlug(db, storeSlug),

    async findPublicStoreBySlug(storeSlug) {
      const [store] = await db
        .select({
          id: stores.id,
          name: stores.tradingName,
          slug: stores.publicSlug,
          tenantId: stores.tenantId,
        })
        .from(stores)
        .innerJoin(
          storePublicSiteSettings,
          and(
            eq(storePublicSiteSettings.storeId, stores.id),
            eq(storePublicSiteSettings.isPublished, true),
          ),
        )
        .where(
          and(
            createPublicStoreLookupCondition(storeSlug),
            eq(stores.isDeleted, false),
            isNull(stores.deletedAt),
          ),
        )
        .limit(1);

      return store
        ? {
            id: store.id,
            name: store.name,
            slug: store.slug,
            tenantId: store.tenantId,
          }
        : null;
    },

    async findPublicListingDetail(input) {
      const [listing] = await db
        .select({
          description: vehicleListings.description,
          listingId: vehicleListings.id,
          manufactureYear: vehicleListings.manufactureYear,
          mileageKm: vehicleListings.mileageKm,
          modelYear: vehicleListings.modelYear,
          priceCents: vehicleListings.askingPriceCents,
          slug: vehicleListings.publicSlug,
          title: vehicleListings.title,
        })
        .from(vehicleListings)
        .where(
          and(
            eq(vehicleListings.publicSlug, input.listingSlug),
            eq(vehicleListings.storeId, input.storeId),
            eq(vehicleListings.tenantId, input.tenantId),
            eq(vehicleListings.status, "published"),
            eq(vehicleListings.isVisibleOnPublicSite, true),
            eq(vehicleListings.isDeleted, false),
            isNotNull(vehicleListings.publicSlug),
            isNull(vehicleListings.deletedAt),
          ),
        )
        .limit(1);

      if (!listing) return null;

      const media = await findListingMedia(db, {
        listingId: listing.listingId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });

      return {
        ...toPublicVehicleListing(listing, firstPhotoUrl(media)),
        media,
      } satisfies PublicVehicleListingDetail;
    },

    async listPublicListings(input) {
      const rows = await db
        .select({
          description: vehicleListings.description,
          listingId: vehicleListings.id,
          manufactureYear: vehicleListings.manufactureYear,
          mileageKm: vehicleListings.mileageKm,
          modelYear: vehicleListings.modelYear,
          priceCents: vehicleListings.askingPriceCents,
          slug: vehicleListings.publicSlug,
          title: vehicleListings.title,
        })
        .from(vehicleListings)
        .where(
          and(
            eq(vehicleListings.storeId, input.storeId),
            eq(vehicleListings.tenantId, input.tenantId),
            eq(vehicleListings.status, "published"),
            eq(vehicleListings.isVisibleOnPublicSite, true),
            eq(vehicleListings.isDeleted, false),
            isNotNull(vehicleListings.publicSlug),
            isNull(vehicleListings.deletedAt),
          ),
        )
        .limit(input.limit);

      return Promise.all(
        rows.map(async (row) => {
          const media = await findListingMedia(db, {
            listingId: row.listingId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
          return toPublicVehicleListing(row, firstPhotoUrl(media));
        }),
      );
    },
  };
}

async function findListingMedia(
  db: DrizzlePublicStorefrontClient,
  input: { listingId: string; storeId: string; tenantId: string },
): Promise<readonly PublicVehicleMedia[]> {
  const rows = await db
    .select({
      altText: vehicleMedia.altText,
      displayOrder: vehicleMedia.displayOrder,
      kind: vehicleMedia.kind,
      url: vehicleMedia.url,
    })
    .from(vehicleMedia)
    .where(
      and(
        eq(vehicleMedia.listingId, input.listingId),
        eq(vehicleMedia.storeId, input.storeId),
        eq(vehicleMedia.tenantId, input.tenantId),
        eq(vehicleMedia.isPublic, true),
        eq(vehicleMedia.isDeleted, false),
        isNull(vehicleMedia.deletedAt),
      ),
    )
    .orderBy(asc(vehicleMedia.displayOrder))
    .limit(48);

  return rows;
}

function firstPhotoUrl(media: readonly PublicVehicleMedia[]) {
  return media.find((item) => item.kind === "photo")?.url ?? null;
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

function toPublicVehicleListing(
  row: ListingRow,
  thumbnailUrl: string | null,
): PublicVehicleListing {
  return {
    description: row.description,
    id: row.listingId,
    manufactureYear: row.manufactureYear,
    mileageKm: row.mileageKm,
    modelYear: row.modelYear,
    priceCents: row.priceCents,
    slug: assertPublicSlug(row.slug),
    status: "available",
    thumbnailUrl,
    title: row.title,
  };
}

function assertPublicSlug(slug: string | null): string {
  if (!slug) {
    throw new PublicStorefrontDataInvariantError(
      "Published public listing is missing public_slug.",
    );
  }

  return slug;
}

export class PublicStorefrontDataInvariantError extends Error {}
