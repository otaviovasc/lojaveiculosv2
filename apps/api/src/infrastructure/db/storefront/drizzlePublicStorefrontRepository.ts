import { and, asc, eq, isNull, or } from "drizzle-orm";
import { stores, vehicleListings, vehicleMedia } from "@lojaveiculosv2/db";
import type {
  PublicStorefrontRepository,
  PublicStorefrontStore,
  PublicVehicleListingDetail,
  PublicVehicleMedia,
  PublicVehicleListing,
} from "../../../domains/storefront/ports/publicStorefrontRepository.js";

type StoreRow = {
  id: PublicStorefrontStore["id"];
  name: string;
  slug: string;
  tenantId: PublicStorefrontStore["tenantId"];
};

type ListingRow = {
  description: string | null;
  listingId: string;
  manufactureYear: number | null;
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  slug: string | null;
  title: string;
};

type MediaRow = {
  altText: string | null;
  displayOrder: number;
  kind: PublicVehicleMedia["kind"];
  mediaId: string;
  url: string;
};

type SelectLimitBuilder<Row> = {
  limit: (count: number) => Promise<readonly Row[]>;
};

type SelectOrderBuilder<Row> = {
  limit: (count: number) => Promise<readonly Row[]>;
};

type SelectWhereResultBuilder<Row> = SelectLimitBuilder<Row> & {
  orderBy: (column: unknown) => SelectOrderBuilder<Row>;
};

type SelectWhereBuilder<Row> = {
  orderBy: (column: unknown) => SelectOrderBuilder<Row>;
  where: (condition: unknown) => SelectWhereResultBuilder<Row>;
};

type SelectFromBuilder<Row> = {
  from: (table: unknown) => SelectWhereBuilder<Row>;
};

export type DrizzlePublicStorefrontClient = {
  select: {
    (selection: {
      id: unknown;
      name: unknown;
      slug: unknown;
      tenantId: unknown;
    }): SelectFromBuilder<StoreRow>;
    (selection: {
      description: unknown;
      listingId: unknown;
      manufactureYear: unknown;
      mileageKm: unknown;
      modelYear: unknown;
      priceCents: unknown;
      slug: unknown;
      title: unknown;
    }): SelectFromBuilder<ListingRow>;
    (selection: {
      altText: unknown;
      displayOrder: unknown;
      kind: unknown;
      mediaId: unknown;
      url: unknown;
    }): SelectFromBuilder<MediaRow>;
  };
};

export function createDrizzlePublicStorefrontRepository(
  db: DrizzlePublicStorefrontClient,
): PublicStorefrontRepository {
  return {
    async findPublicStoreBySlug(storeSlug) {
      const [store] = await db
        .select({
          id: stores.id,
          name: stores.tradingName,
          slug: stores.publicSlug,
          tenantId: stores.tenantId,
        })
        .from(stores)
        .where(
          and(
            eq(stores.publicSlug, storeSlug),
            eq(stores.isDeleted, false),
            isNull(stores.deletedAt),
          ),
        )
        .limit(1);

      return store ?? null;
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
            createPublicListingSlugCondition(input.listingSlug),
            eq(vehicleListings.storeId, input.storeId),
            eq(vehicleListings.tenantId, input.tenantId),
            eq(vehicleListings.status, "published"),
            eq(vehicleListings.isVisibleOnPublicSite, true),
            eq(vehicleListings.isDeleted, false),
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
        ...toPublicVehicleListing(listing),
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
            isNull(vehicleListings.deletedAt),
          ),
        )
        .limit(input.limit);

      return rows.map(toPublicVehicleListing);
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
      mediaId: vehicleMedia.id,
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

function createPublicListingSlugCondition(listingSlug: string) {
  if (!isUuid(listingSlug)) return eq(vehicleListings.publicSlug, listingSlug);

  return or(
    eq(vehicleListings.publicSlug, listingSlug),
    eq(vehicleListings.id, listingSlug),
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value,
  );
}

function toPublicVehicleListing(row: ListingRow): PublicVehicleListing {
  return {
    description: row.description,
    listingId: row.listingId,
    manufactureYear: row.manufactureYear,
    mileageKm: row.mileageKm,
    modelYear: row.modelYear,
    priceCents: row.priceCents,
    slug: row.slug ?? row.listingId,
    status: "available",
    thumbnailUrl: null,
    title: row.title,
  };
}
