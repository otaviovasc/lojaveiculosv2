import { and, eq, isNull } from "drizzle-orm";
import { vehicleListings, vehicleUnits } from "@lojaveiculosv2/db";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import type {
  CreateVehicleListingRecord,
  CreateVehicleUnitRecord,
  FindVehicleListingInput,
  VehicleListing,
  VehicleListingRepository,
  VehicleUnit,
  VehicleUnitRepository,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  requireReturnedRow,
  toDbListingStatus,
  toDbUnitStatus,
  toVehicleListing,
  toVehicleUnit,
  VehicleInventoryDrizzleScopeError,
  type InsertVehicleListingRow,
  type InsertVehicleUnitRow,
  type UpdateVehicleListingRow,
  type UpdateVehicleUnitRow,
  type VehicleListingRow,
  type VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";

type DrizzleVehicleListingClient = DrizzleRepositoryClient<
  VehicleListingRow,
  InsertVehicleListingRow,
  UpdateVehicleListingRow
>;
type DrizzleVehicleUnitClient = DrizzleRepositoryClient<
  VehicleUnitRow,
  InsertVehicleUnitRow,
  UpdateVehicleUnitRow
>;

export type DrizzleVehicleInventoryClient = DrizzleVehicleListingClient &
  DrizzleVehicleUnitClient;

export function createDrizzleVehicleInventoryRepositories(
  db: DrizzleVehicleInventoryClient,
): {
  listingRepository: VehicleListingRepository;
  unitRepository: VehicleUnitRepository;
} {
  const listingRepository = createDrizzleVehicleListingRepository(db);
  const unitRepository = createDrizzleVehicleUnitRepository(db);

  return { listingRepository, unitRepository };
}

export function createDrizzleVehicleListingRepository(
  db: DrizzleVehicleInventoryClient,
): VehicleListingRepository {
  const listingDb = db as DrizzleVehicleListingClient;

  return {
    async create(record) {
      const scope = requireDbScope(record);
      const [row] = await listingDb
        .insert(vehicleListings)
        .values({
          askingPriceCents: record.priceCents,
          description: record.description,
          status: toDbListingStatus(record.status),
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          title: record.title,
        })
        .returning();

      return toVehicleListing(
        requireReturnedRow(row, "vehicle listing create"),
        [],
      );
    },

    async findById(input) {
      const scope = requireDbScope(input);
      if (!isUuid(input.listingId)) return null;
      const [row] = await listingDb
        .select()
        .from(vehicleListings)
        .where(
          and(
            eq(vehicleListings.id, input.listingId),
            eq(vehicleListings.storeId, scope.storeId),
            eq(vehicleListings.tenantId, scope.tenantId),
            eq(vehicleListings.isDeleted, false),
            isNull(vehicleListings.deletedAt),
          ),
        );

      if (!row) return null;

      const units = await findListingUnits(db, row.id);
      return toVehicleListing(row, units);
    },

    async save(listing) {
      const scope = requireDbScope(listing);
      const [row] = await listingDb
        .update(vehicleListings)
        .set({
          askingPriceCents: listing.priceCents,
          description: listing.description,
          status: toDbListingStatus(listing.status),
          title: listing.title,
          updatedAt: listing.updatedAt,
        })
        .where(
          and(
            eq(vehicleListings.id, listing.id),
            eq(vehicleListings.storeId, scope.storeId),
            eq(vehicleListings.tenantId, scope.tenantId),
            eq(vehicleListings.isDeleted, false),
            isNull(vehicleListings.deletedAt),
          ),
        )
        .returning();

      return toVehicleListing(
        requireReturnedRow(row, `vehicle listing save ${listing.id}`),
        await findListingUnits(db, listing.id),
      );
    },
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function createDrizzleVehicleUnitRepository(
  db: DrizzleVehicleInventoryClient,
): VehicleUnitRepository {
  const unitDb = db as DrizzleVehicleUnitClient;

  return {
    async create(record) {
      const scope = requireDbScope(record);
      const [row] = await unitDb
        .insert(vehicleUnits)
        .values({
          listingId: record.listingId,
          plate: record.plate,
          status: toDbUnitStatus(record.status),
          stockNumber: record.stockNumber,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          vin: record.vin,
        })
        .returning();

      return toVehicleUnit(requireReturnedRow(row, "vehicle unit create"));
    },
  };
}

function requireDbScope(
  record:
    | CreateVehicleListingRecord
    | CreateVehicleUnitRecord
    | FindVehicleListingInput
    | VehicleListing,
): { storeId: string; tenantId: string } {
  if (!record.storeId) throw new VehicleInventoryDrizzleScopeError("storeId");
  if (!record.tenantId) throw new VehicleInventoryDrizzleScopeError("tenantId");

  return { storeId: record.storeId, tenantId: record.tenantId };
}

async function findListingUnits(
  db: DrizzleVehicleInventoryClient,
  listingId: string,
): Promise<readonly VehicleUnit[]> {
  const unitDb = db as DrizzleVehicleUnitClient;
  const rows = await unitDb
    .select()
    .from(vehicleUnits)
    .where(
      and(
        eq(vehicleUnits.listingId, listingId),
        eq(vehicleUnits.isDeleted, false),
        isNull(vehicleUnits.deletedAt),
      ),
    );

  return rows.map(toVehicleUnit);
}
