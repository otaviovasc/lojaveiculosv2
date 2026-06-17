import { stores, vehicleListings, vehicleMedia } from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { DrizzlePublicStorefrontClient } from "./drizzlePublicStorefrontRepository.js";

type StoreRow = {
  id: StoreId;
  name: string;
  slug: string;
  tenantId: TenantId;
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
  kind: "document_preview" | "photo" | "video";
  mediaId: string;
  url: string;
};

export function createFakePublicStorefrontDb() {
  const queriedTables: unknown[] = [];
  const db = {
    queriedTables,
    select() {
      return {
        from(table: unknown) {
          queriedTables.push(table);
          return {
            where() {
              return {
                orderBy() {
                  return {
                    async limit(count: number) {
                      return rowsFor(table).slice(0, count);
                    },
                  };
                },
                async limit(count: number) {
                  return rowsFor(table).slice(0, count);
                },
              };
            },
          };
        },
      };
    },
  };

  return db as typeof db & DrizzlePublicStorefrontClient;
}

function rowsFor(
  table: unknown,
): readonly (StoreRow | ListingRow | MediaRow)[] {
  if (table === stores) {
    return [
      {
        id: "store_1" as StoreId,
        name: "Loja Demo",
        slug: "demo",
        tenantId: "tenant_1" as TenantId,
      },
    ];
  }

  if (table === vehicleListings) {
    return [
      {
        description: "Ready to sell.",
        listingId: "listing_1",
        manufactureYear: 2022,
        mileageKm: 32000,
        modelYear: 2023,
        priceCents: 12690000,
        slug: "fiat-toro-2023",
        title: "Fiat Toro Volcano 2023",
      },
    ];
  }

  if (table === vehicleMedia) {
    return [
      {
        altText: "Front photo",
        displayOrder: 0,
        kind: "photo",
        mediaId: "media_1",
        url: "https://cdn.local/front.jpg",
      },
    ];
  }

  throw new Error(`Unhandled fake public storefront table: ${String(table)}`);
}
