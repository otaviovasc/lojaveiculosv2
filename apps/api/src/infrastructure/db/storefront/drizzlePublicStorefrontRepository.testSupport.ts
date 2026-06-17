import { stores, vehicleListings } from "@lojaveiculosv2/db";
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

function rowsFor(table: unknown): readonly (StoreRow | ListingRow)[] {
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

  throw new Error(`Unhandled fake public storefront table: ${String(table)}`);
}
