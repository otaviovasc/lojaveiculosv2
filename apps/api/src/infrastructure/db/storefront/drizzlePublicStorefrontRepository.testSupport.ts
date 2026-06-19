import {
  storePublicSiteSettings,
  stores,
  vehicleListings,
  vehicleMedia,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  DrizzlePublicStorefrontClient,
  ListingRow,
  MediaRow,
  PublicSiteRow,
  StoreRow,
} from "./drizzlePublicStorefrontQueryTypes.js";

export function createFakePublicStorefrontDb() {
  const queriedTables: unknown[] = [];
  const db = {
    queriedTables,
    select() {
      return {
        from(table: unknown) {
          queriedTables.push(table);
          const builder = {
            innerJoin(joinedTable: unknown) {
              queriedTables.push(joinedTable);
              return builder;
            },
            leftJoin(joinedTable: unknown) {
              queriedTables.push(joinedTable);
              return builder;
            },
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
          return builder;
        },
      };
    },
  };

  return db as typeof db & DrizzlePublicStorefrontClient;
}

function rowsFor(
  table: unknown,
): readonly (StoreRow | ListingRow | MediaRow | PublicSiteRow)[] {
  if (table === stores) {
    return [
      {
        addressCity: "Sao Paulo",
        contactEmail: "contato@demo.com.br",
        contactPhone: null,
        customDomain: null,
        heroImageUrl: "https://cdn.local/hero.jpg",
        id: "store_1" as StoreId,
        layoutKey: "default",
        name: "Loja Demo",
        seoDescription: "Estoque selecionado",
        seoTitle: "Loja Demo",
        slug: "demo",
        storeId: "store_1" as StoreId,
        tenantId: "tenant_1" as TenantId,
        theme: {},
        whatsappPhone: "5511999999999",
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
        url: "https://cdn.local/front.jpg",
      },
    ];
  }

  if (table === storePublicSiteSettings) return [];

  throw new Error(`Unhandled fake public storefront table: ${String(table)}`);
}
