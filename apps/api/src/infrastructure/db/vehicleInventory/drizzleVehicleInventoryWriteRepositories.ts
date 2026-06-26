import { and, eq, isNull } from "drizzle-orm";
import { vehicleUnits } from "@lojaveiculosv2/db";
import type {
  CreateVehicleUnitRecord,
  VehicleUnit,
  VehicleUnitRepository,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import {
  requireReturnedRow,
  toDbUnitStatus,
  toVehicleUnit,
  type InsertVehicleUnitRow,
  type VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";
import { findListingsUnits } from "./drizzleVehicleInventoryReads.js";
import {
  isUuid,
  requireWriteScope,
} from "./drizzleVehicleInventoryWriteSupport.js";

export {
  createDrizzleVehicleMediaRepository,
  type DrizzleVehicleMediaClient,
} from "./drizzleVehicleMediaWriteRepository.js";

export type DrizzleVehicleUnitClient = DrizzleRepositoryClient<
  VehicleUnitRow,
  InsertVehicleUnitRow,
  Partial<InsertVehicleUnitRow>
>;

export function createDrizzleVehicleUnitRepository(
  db: DrizzleVehicleUnitClient,
): VehicleUnitRepository {
  return {
    async create(record) {
      const scope = requireWriteScope(record);
      const [row] = await db
        .insert(vehicleUnits)
        .values({
          colorName: record.colorName ?? null,
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
    async findById(input) {
      if (!isUuid(input.unitId)) return null;
      const [row] = await db
        .select()
        .from(vehicleUnits)
        .where(
          and(
            eq(vehicleUnits.id, input.unitId),
            eq(vehicleUnits.storeId, input.storeId ?? ""),
            eq(vehicleUnits.tenantId, input.tenantId ?? ""),
            eq(vehicleUnits.isDeleted, false),
            isNull(vehicleUnits.deletedAt),
          ),
        );

      if (!row) return null;
      if (input.listingId && row.listingId !== input.listingId) return null;
      return toVehicleUnit(row);
    },
    async listByListingIds(input) {
      const units = await findListingsUnits(db, input.listingIds);

      return units.filter(
        (unit) =>
          unit.storeId === input.storeId && unit.tenantId === input.tenantId,
      );
    },
    async list(input) {
      const rows = await db
        .select()
        .from(vehicleUnits)
        .where(
          and(
            eq(vehicleUnits.storeId, input.storeId ?? ""),
            eq(vehicleUnits.tenantId, input.tenantId ?? ""),
            eq(vehicleUnits.isDeleted, false),
            isNull(vehicleUnits.deletedAt),
          ),
        );

      return rows
        .map(toVehicleUnit)
        .filter((unit) => !input.status || unit.status === input.status)
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(input.offset, input.offset + input.limit);
    },
    async save(unit) {
      const scope = requireWriteScope(unit);
      const [row] = await db
        .update(vehicleUnits)
        .set({
          colorName: unit.colorName,
          plate: unit.plate,
          status: toDbUnitStatus(unit.status),
          stockNumber: unit.stockNumber,
          updatedAt: unit.updatedAt,
          vin: unit.vin,
        })
        .where(
          and(
            eq(vehicleUnits.id, unit.id),
            eq(vehicleUnits.listingId, unit.listingId),
            eq(vehicleUnits.storeId, scope.storeId),
            eq(vehicleUnits.tenantId, scope.tenantId),
            eq(vehicleUnits.isDeleted, false),
            isNull(vehicleUnits.deletedAt),
          ),
        )
        .returning();

      return toVehicleUnit(requireReturnedRow(row, "vehicle unit save"));
    },
  };
}
