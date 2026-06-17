import { and, eq, isNull } from "drizzle-orm";
import { stores, vehicleListings } from "@lojaveiculosv2/db";
import type {
  PublicStorefrontRepository,
  PublicStorefrontStore,
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

type SelectLimitBuilder<Row> = {
  limit: (count: number) => Promise<readonly Row[]>;
};

type SelectWhereBuilder<Row> = {
  where: (condition: unknown) => SelectLimitBuilder<Row>;
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
