import { and, desc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
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
  toPublicVehicleListingSummary,
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

    findPublicListingDetail: (input) =>
      findPublicListingDetail(db, input, "slug"),
    findPublicListingDetailById: (input) =>
      findPublicListingDetail(db, input, "id"),

    async listPublicListings(input) {
      const rows = await db
        .select({
          listingMetadata: vehicleListings.metadata,
          condition: vehicleListings.condition,
          description: vehicleListings.description,
          doors: vehicleListings.doors,
          engineAspiration: vehicleListings.engineAspiration,
          engineDisplacement: vehicleListings.engineDisplacement,
          featuredUntil: vehicleListings.featuredUntil,
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
        .orderBy(
          desc(
            sql`case when ${vehicleListings.featuredUntil} > now() then 1 else 0 end`,
          ),
          desc(vehicleListings.featuredUntil),
          desc(
            sql`case when ${vehicleListings.metadata}->>'legacyFeatured' = 'true' then 1 else 0 end`,
          ),
          desc(vehicleListings.createdAt),
          desc(vehicleListings.id),
        )
        .offset(input.offset ?? 0)
        .limit(input.limit);

      return Promise.all(
        rows.map(async (row) => {
          const gallery = await findListingGallery(db, {
            listingId: row.listingId,
            storeId: input.storeId,
            tenantId: input.tenantId,
          });
          return toPublicVehicleListingSummary(
            row,
            gallery.thumbnailUrl,
            gallery.heroMedia,
            gallery.defaultMedia,
          );
        }),
      );
    },
  };
}

async function findPublicListingDetail(
  db: DrizzlePublicStorefrontClient,
  input: {
    listingId?: string;
    listingSlug?: string;
    storeId: string;
    tenantId: string;
  },
  lookup: "id" | "slug",
): Promise<PublicVehicleListingDetail | null> {
  const [listing] = await db
    .select({
      listingMetadata: vehicleListings.metadata,
      condition: vehicleListings.condition,
      description: vehicleListings.description,
      doors: vehicleListings.doors,
      engineAspiration: vehicleListings.engineAspiration,
      engineDisplacement: vehicleListings.engineDisplacement,
      featuredUntil: vehicleListings.featuredUntil,
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
        lookup === "id"
          ? eq(vehicleListings.id, input.listingId ?? "")
          : eq(vehicleListings.publicSlug, input.listingSlug ?? ""),
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
    ...toPublicVehicleListing(
      listing,
      gallery.thumbnailUrl,
      gallery.heroMedia,
      gallery.defaultMedia,
    ),
    mediaGroups: gallery.mediaGroups,
  } satisfies PublicVehicleListingDetail;
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
