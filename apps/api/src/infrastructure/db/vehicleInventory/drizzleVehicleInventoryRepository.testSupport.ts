import { vehicleListings, vehicleUnits } from "@lojaveiculosv2/db";
import type { DrizzleVehicleInventoryClient } from "./drizzleVehicleInventoryRepository.js";
import type {
  InsertVehicleListingRow,
  InsertVehicleUnitRow,
  UpdateVehicleListingRow,
  UpdateVehicleUnitRow,
  VehicleListingRow,
  VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";

type InsertRecord = InsertVehicleListingRow | InsertVehicleUnitRow;
type UpdateRecord = UpdateVehicleListingRow | UpdateVehicleUnitRow;

type StoredRows = {
  listings: VehicleListingRow[];
  units: VehicleUnitRow[];
};

export function createFakeDb(initialRows: Partial<StoredRows> = {}) {
  const rows: StoredRows = {
    listings: initialRows.listings ?? [],
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
              return table === vehicleListings ? rows.listings : rows.units;
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
        brandId: null,
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
        modelId: null,
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
