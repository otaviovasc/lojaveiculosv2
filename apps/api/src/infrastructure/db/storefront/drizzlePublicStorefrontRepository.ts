import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import {
  storePublicSiteSettings,
  stores,
  vehicleListings,
} from "@lojaveiculosv2/db";
import type {
  PublicStorefrontRepository,
  PublicVehicleListingDetail,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import { findListingGallery } from "./drizzlePublicStorefrontGallery.js";
import {
  PublicStorefrontDataInvariantError,
  toPublicVehicleListing,
} from "./drizzlePublicStorefrontListingMapper.js";
import type { DrizzlePublicStorefrontClient } from "./drizzlePublicStorefrontQueryTypes.js";
import { findPublicSiteBySlug } from "./drizzlePublicStorefrontSite.js";

export { PublicStorefrontDataInvariantError };

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
          condition: vehicleListings.condition,
          description: vehicleListings.description,
          doors: vehicleListings.doors,
          engineAspiration: vehicleListings.engineAspiration,
          engineDisplacement: vehicleListings.engineDisplacement,
          fuelType: vehicleListings.fuelType,
          listingId: vehicleListings.id,
          manufactureYear: vehicleListings.manufactureYear,
          mileageKm: vehicleListings.mileageKm,
          modelYear: vehicleListings.modelYear,
          priceCents: vehicleListings.askingPriceCents,
          slug: vehicleListings.publicSlug,
          title: vehicleListings.title,
          transmission: vehicleListings.transmission,
          trimName: vehicleListings.trimName,
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

      const gallery = await findListingGallery(db, {
        listingId: listing.listingId,
        storeId: input.storeId,
        tenantId: input.tenantId,
      });

      return {
        ...toPublicVehicleListing(listing, gallery.thumbnailUrl),
        media: gallery.defaultMedia,
        mediaGroups: gallery.mediaGroups,
      } satisfies PublicVehicleListingDetail;
    },

    async listPublicListings(input) {
      const rows = await db
        .select({
          condition: vehicleListings.condition,
          description: vehicleListings.description,
          doors: vehicleListings.doors,
          engineAspiration: vehicleListings.engineAspiration,
          engineDisplacement: vehicleListings.engineDisplacement,
          fuelType: vehicleListings.fuelType,
          listingId: vehicleListings.id,
          manufactureYear: vehicleListings.manufactureYear,
          mileageKm: vehicleListings.mileageKm,
          modelYear: vehicleListings.modelYear,
          priceCents: vehicleListings.askingPriceCents,
          slug: vehicleListings.publicSlug,
          title: vehicleListings.title,
          transmission: vehicleListings.transmission,
          trimName: vehicleListings.trimName,
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
          const gallery = await findListingGallery(db, {
            listingId: row.listingId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
          return toPublicVehicleListing(row, gallery.thumbnailUrl);
        }),
      );
    },
  };
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
