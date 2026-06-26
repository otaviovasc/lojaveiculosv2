import {
  storePublicSiteSettings,
  stores,
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  DrizzlePublicStorefrontClient,
  ListingRow,
  MediaRow,
  PublicSiteRow,
  StoreRow,
  UnitRow,
} from "./drizzlePublicStorefrontQueryTypes.js";

type FakePublicStorefrontRows = {
  listings: readonly ListingRow[];
  media: readonly MediaRow[];
  publicSites: readonly PublicSiteRow[];
  stores: readonly StoreRow[];
  units: readonly UnitRow[];
};

export function createFakePublicStorefrontDb(
  overrides: Partial<FakePublicStorefrontRows> = {},
) {
  const queriedTables: unknown[] = [];
  const rows = { ...defaultRows(), ...overrides };
  const db = {
    queriedTables,
    select(selection?: Record<string, unknown>) {
      return {
        from(table: unknown) {
          queriedTables.push(table);
          const rowKind =
            selection && "layoutKey" in selection ? "publicSite" : "table";
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
                      return rowsFor(table, rows, rowKind).slice(0, count);
                    },
                  };
                },
                async limit(count: number) {
                  return rowsFor(table, rows, rowKind).slice(0, count);
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
  rows: FakePublicStorefrontRows,
  rowKind: "publicSite" | "table",
): readonly (StoreRow | ListingRow | MediaRow | PublicSiteRow | UnitRow)[] {
  if (table === stores) {
    return rowKind === "publicSite" ? rows.publicSites : rows.stores;
  }

  if (table === vehicleListings) return rows.listings;
  if (table === vehicleMedia) return rows.media;
  if (table === vehicleUnits) return rows.units;
  if (table === storePublicSiteSettings) return rows.publicSites;

  throw new Error(`Unhandled fake public storefront table: ${String(table)}`);
}

function defaultRows(): FakePublicStorefrontRows {
  return {
    listings: [
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
    ],
    media: [
      {
        altText: "Front photo",
        displayOrder: 0,
        kind: "photo",
        unitId: "unit_1",
        url: "https://cdn.local/front.jpg",
      },
    ],
    publicSites: [
      {
        addressCity: "Sao Paulo",
        contactEmail: "contato@demo.com.br",
        contactPhone: null,
        customDomain: null,
        heroImageUrl: "https://cdn.local/hero.jpg",
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
    ],
    stores: [
      {
        id: "store_1" as StoreId,
        name: "Loja Demo",
        slug: "demo",
        tenantId: "tenant_1" as TenantId,
      },
    ],
    units: [
      {
        colorName: "Preto",
        id: "unit_1",
        status: "available",
        stockNumber: "LV-0001",
      },
    ],
  };
}
