import {
  vehicleListings,
  vehicleMedia,
  vehicleUnits,
} from "@lojaveiculosv2/db";
import type { DrizzleVehicleInventoryClient } from "./drizzleVehicleInventoryRepository.js";
import type {
  InsertVehicleListingRow,
  InsertVehicleMediaRow,
  InsertVehicleUnitRow,
  UpdateVehicleListingRow,
  UpdateVehicleUnitRow,
  VehicleListingRow,
  VehicleMediaRow,
  VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";

type InsertRecord =
  | InsertVehicleListingRow
  | InsertVehicleMediaRow
  | InsertVehicleUnitRow;
type UpdateRecord = UpdateVehicleListingRow | UpdateVehicleUnitRow;

type StoredRows = {
  listings: VehicleListingRow[];
  media: VehicleMediaRow[];
  units: VehicleUnitRow[];
};

export function createFakeDb(initialRows: Partial<StoredRows> = {}) {
  const rows: StoredRows = {
    listings: initialRows.listings ?? [],
    media: initialRows.media ?? [],
    units: initialRows.units ?? [],
  };
  const inserted: InsertRecord[] = [];
  const updated: UpdateRecord[] = [];
  const rowFactory = createRows();

  const db = {
    inserted,
    updated,
    insert(table: unknown) {
      return {
        values(record: InsertRecord) {
          inserted.push(record);
          return {
            async returning() {
              if (table === vehicleListings) {
                const row = {
                  ...rowFactory.listing(),
                  ...(record as Partial<VehicleListingRow>),
                  id: `listing_${rows.listings.length + 1}`,
                };
                rows.listings.push(row);
                return [row];
              }

              if (table === vehicleMedia) {
                const row = {
                  ...rowFactory.media(),
                  ...(record as Partial<VehicleMediaRow>),
                  id: `media_${rows.media.length + 1}`,
                };
                rows.media.push(row);
                return [row];
              }

              const row = {
                ...rowFactory.unit(),
                ...(record as Partial<VehicleUnitRow>),
                id: `unit_${rows.units.length + 1}`,
              };
              rows.units.push(row);
              return [row];
            },
          };
        },
      };
    },
    select() {
      return {
        from(table: unknown) {
          return {
            async where() {
              if (table === vehicleListings) return rows.listings;
              if (table === vehicleMedia) return rows.media;
              return rows.units;
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(record: UpdateRecord) {
          updated.push(record);
          return {
            where() {
              return {
                async returning() {
                  if (table === vehicleListings) {
                    return updateFirst(
                      rows.listings,
                      record as UpdateVehicleListingRow,
                    );
                  }

                  return updateFirst(
                    rows.units,
                    record as UpdateVehicleUnitRow,
                  );
                },
              };
            },
          };
        },
      };
    },
  };

  return db as typeof db & DrizzleVehicleInventoryClient;
}

export function createRows() {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    listing(overrides: Partial<VehicleListingRow> = {}): VehicleListingRow {
      return {
        askingPriceCents: null,
        condition: "used",
        createdAt: now,
        deletedAt: null,
        description: null,
        doors: null,
        engineDisplacement: null,
        featuredUntil: null,
        fuelType: null,
        id: "listing_1",
        isDeleted: false,
        isVisibleOnPublicSite: false,
        manufactureYear: null,
        metadata: {},
        mileageKm: null,
        modelYear: null,
        publicSlug: null,
        status: "draft",
        storeId: "store_1",
        tenantId: "tenant_1",
        title: "Civic",
        transmission: null,
        trimName: null,
        updatedAt: now,
        ...overrides,
      };
    },
    unit(overrides: Partial<VehicleUnitRow> = {}): VehicleUnitRow {
      return {
        acquisitionDate: null,
        acquisitionPriceCents: null,
        colorName: null,
        createdAt: now,
        deletedAt: null,
        id: "unit_1",
        isDeleted: false,
        listingId: "listing_1",
        plate: null,
        status: "available",
        stockNumber: null,
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: now,
        vin: null,
        ...overrides,
      };
    },
    media(overrides: Partial<VehicleMediaRow> = {}): VehicleMediaRow {
      return {
        altText: null,
        createdAt: now,
        deletedAt: null,
        displayOrder: 0,
        id: "media_1",
        isDeleted: false,
        isPublic: true,
        kind: "photo",
        listingId: "listing_1",
        metadata: {},
        storageKey:
          "tenants/tenant_1/stores/store_1/listings/listing_1/front.jpg",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: now,
        url: "https://cdn.local/front.jpg",
        ...overrides,
      };
    },
  };
}

function updateFirst<Row>(rows: Row[], record: Partial<Row>): readonly Row[] {
  const current = rows[0];
  if (!current) return [];

  const row = {
    ...current,
    ...record,
  };
  rows[0] = row;
  return [row];
}
