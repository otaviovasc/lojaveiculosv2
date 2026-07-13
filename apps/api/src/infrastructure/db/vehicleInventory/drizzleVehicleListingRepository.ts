import { and, eq, isNull } from "drizzle-orm";
import { vehicleListings } from "@lojaveiculosv2/db";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import type { VehicleListingRepository } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import {
  createListingMetadata,
  requireReturnedRow,
  toDbListingStatus,
  toVehicleListing,
  type InsertVehicleListingRow,
  type UpdateVehicleListingRow,
  type VehicleListingRow,
} from "./drizzleVehicleInventoryMappers.js";
import {
  isVehicleInventoryUuid,
  requireDbScope,
} from "./drizzleVehicleInventoryScope.js";
import {
  findListingByPublicSlug,
  findListingUnits,
  findListingsUnits,
  matchesListingFilters,
  type DrizzleVehicleInventoryReadClient,
} from "./drizzleVehicleInventoryReads.js";

type DrizzleVehicleListingWriteClient = DrizzleRepositoryClient<
  VehicleListingRow,
  InsertVehicleListingRow,
  UpdateVehicleListingRow
>;

type DrizzleVehicleListingLockClient = {
  select: () => {
    from: (table: unknown) => {
      where: (condition: unknown) => {
        for: (strength: "update") => Promise<readonly VehicleListingRow[]>;
      };
    };
  };
};

export type DrizzleVehicleListingClient = DrizzleVehicleListingWriteClient &
  DrizzleVehicleInventoryReadClient;

export function createDrizzleVehicleListingRepository(
  db: DrizzleVehicleListingClient,
): VehicleListingRepository {
  const listingDb = db as DrizzleVehicleListingWriteClient;
  return {
    async create(record) {
      const scope = requireDbScope(record);
      const [row] = await listingDb
        .insert(vehicleListings)
        .values({
          askingPriceCents: record.priceCents,
          description: record.description,
          doors: record.doors ?? null,
          engineAspiration: record.engineAspiration ?? null,
          engineDisplacement: record.engineDisplacement ?? null,
          fuelType: record.fuelType ?? null,
          internalNotes: record.internalNotes ?? null,
          isVisibleOnPublicSite: record.isVisibleOnPublicSite ?? false,
          manufactureYear: record.manufactureYear,
          metadata: createListingMetadata(record.catalog),
          mileageKm: record.mileageKm ?? null,
          modelYear: record.modelYear,
          publicSlug: record.publicSlug ?? null,
          status: toDbListingStatus(record.status),
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          title: record.title,
          transmission: record.transmission ?? null,
          trimName: record.trimName,
        })
        .returning();

      return toVehicleListing(
        requireReturnedRow(row, "vehicle listing create"),
        [],
      );
    },

    async delete(listing) {
      const scope = requireDbScope(listing);
      const deletedAt = new Date();
      const [row] = await listingDb
        .update(vehicleListings)
        .set({
          deletedAt,
          isDeleted: true,
          updatedAt: deletedAt,
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
        requireReturnedRow(row, `vehicle listing delete ${listing.id}`),
        await findListingUnits(db, listing.id),
      );
    },

    async findById(input) {
      const scope = requireDbScope(input);
      if (!isVehicleInventoryUuid(input.listingId)) return null;
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

    async findByPublicSlug(input) {
      return findListingByPublicSlug(db, input);
    },

    async list(input) {
      const scope = requireDbScope(input);
      const rows = await listingDb
        .select()
        .from(vehicleListings)
        .where(
          and(
            eq(vehicleListings.storeId, scope.storeId),
            eq(vehicleListings.tenantId, scope.tenantId),
            eq(vehicleListings.isDeleted, false),
            isNull(vehicleListings.deletedAt),
          ),
        );

      const units = await findListingsUnits(
        db,
        rows.map((row) => row.id),
      );

      return rows
        .map((row) =>
          toVehicleListing(
            row,
            units.filter((unit) => unit.listingId === row.id),
          ),
        )
        .filter((listing) => matchesListingFilters(listing, input))
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(input.offset, input.offset + input.limit);
    },

    async lockForStockTransition(input) {
      const scope = requireDbScope(input);
      if (!isVehicleInventoryUuid(input.listingId)) return null;
      const lockingDb = db as unknown as DrizzleVehicleListingLockClient;
      const [row] = await lockingDb
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
        )
        .for("update");

      return row
        ? toVehicleListing(row, await findListingUnits(db, row.id))
        : null;
    },

    async save(listing) {
      const scope = requireDbScope(listing);
      const [row] = await listingDb
        .update(vehicleListings)
        .set({
          askingPriceCents: listing.priceCents,
          description: listing.description,
          doors: listing.doors,
          engineAspiration: listing.engineAspiration,
          engineDisplacement: listing.engineDisplacement,
          fuelType: listing.fuelType,
          internalNotes: listing.internalNotes,
          isVisibleOnPublicSite: listing.isVisibleOnPublicSite,
          manufactureYear: listing.manufactureYear,
          metadata: createListingMetadata(listing.catalog),
          mileageKm: listing.mileageKm,
          modelYear: listing.modelYear,
          publicSlug: listing.publicSlug,
          status: toDbListingStatus(listing.status),
          title: listing.title,
          transmission: listing.transmission,
          trimName: listing.trimName,
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
