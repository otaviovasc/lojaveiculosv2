import { and, eq, isNull } from "drizzle-orm";
import { vehicleMedia, vehicleUnits } from "@lojaveiculosv2/db";
import type {
  CreateVehicleMediaRecord,
  CreateVehicleUnitRecord,
  VehicleUnit,
  VehicleMediaRepository,
  VehicleUnitRepository,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import {
  requireReturnedRow,
  toDbUnitStatus,
  toVehicleMedia,
  toVehicleUnit,
  type InsertVehicleMediaRow,
  type InsertVehicleUnitRow,
  type VehicleMediaRow,
  type VehicleUnitRow,
} from "./drizzleVehicleInventoryMappers.js";
import { VehicleInventoryDrizzleScopeError } from "./drizzleVehicleInventoryScope.js";
import {
  findListingsMedia,
  findListingsUnits,
} from "./drizzleVehicleInventoryReads.js";

export type DrizzleVehicleUnitClient = DrizzleRepositoryClient<
  VehicleUnitRow,
  InsertVehicleUnitRow,
  Partial<InsertVehicleUnitRow>
>;

export type DrizzleVehicleMediaClient = DrizzleRepositoryClient<
  VehicleMediaRow,
  InsertVehicleMediaRow,
  Partial<InsertVehicleMediaRow>
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
            eq(vehicleUnits.listingId, input.listingId),
            eq(vehicleUnits.storeId, input.storeId ?? ""),
            eq(vehicleUnits.tenantId, input.tenantId ?? ""),
            eq(vehicleUnits.isDeleted, false),
            isNull(vehicleUnits.deletedAt),
          ),
        );

      return row ? toVehicleUnit(row) : null;
    },
    async listByListingIds(input) {
      const units = await findListingsUnits(db, input.listingIds);

      return units.filter(
        (unit) =>
          unit.storeId === input.storeId && unit.tenantId === input.tenantId,
      );
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

export function createDrizzleVehicleMediaRepository(
  db: DrizzleVehicleMediaClient,
): VehicleMediaRepository {
  return {
    async create(record) {
      const scope = requireWriteScope(record);
      const [row] = await db
        .insert(vehicleMedia)
        .values({
          altText: record.altText,
          displayOrder: record.displayOrder,
          isPublic: record.isPublic,
          kind: record.kind,
          listingId: record.listingId,
          storageKey: record.storageKey,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          url: record.url,
        })
        .returning();

      return toVehicleMedia(requireReturnedRow(row, "vehicle media create"));
    },
    async delete(media) {
      const scope = requireWriteScope(media);
      const [row] = await db
        .update(vehicleMedia)
        .set({
          deletedAt: new Date(),
          isDeleted: true,
          updatedAt: media.updatedAt,
        })
        .where(
          and(
            eq(vehicleMedia.id, media.id),
            eq(vehicleMedia.listingId, media.listingId),
            eq(vehicleMedia.storeId, scope.storeId),
            eq(vehicleMedia.tenantId, scope.tenantId),
            eq(vehicleMedia.isDeleted, false),
            isNull(vehicleMedia.deletedAt),
          ),
        )
        .returning();

      return toVehicleMedia(requireReturnedRow(row, "vehicle media delete"));
    },
    async findById(input) {
      if (!isUuid(input.mediaId)) return null;
      const [row] = await db
        .select()
        .from(vehicleMedia)
        .where(
          and(
            eq(vehicleMedia.id, input.mediaId),
            eq(vehicleMedia.listingId, input.listingId),
            eq(vehicleMedia.storeId, input.storeId ?? ""),
            eq(vehicleMedia.tenantId, input.tenantId ?? ""),
            eq(vehicleMedia.isDeleted, false),
            isNull(vehicleMedia.deletedAt),
          ),
        );

      return row ? toVehicleMedia(row) : null;
    },
    async listByListingIds(input) {
      const media = await findListingsMedia(db, input.listingIds);

      return media.filter(
        (item) =>
          item.storeId === input.storeId && item.tenantId === input.tenantId,
      );
    },
    async save(media) {
      const scope = requireWriteScope(media);
      const [row] = await db
        .update(vehicleMedia)
        .set({
          altText: media.altText,
          displayOrder: media.displayOrder,
          isPublic: media.isPublic,
          updatedAt: media.updatedAt,
        })
        .where(
          and(
            eq(vehicleMedia.id, media.id),
            eq(vehicleMedia.listingId, media.listingId),
            eq(vehicleMedia.storeId, scope.storeId),
            eq(vehicleMedia.tenantId, scope.tenantId),
            eq(vehicleMedia.isDeleted, false),
            isNull(vehicleMedia.deletedAt),
          ),
        )
        .returning();

      return toVehicleMedia(requireReturnedRow(row, "vehicle media save"));
    },
  };
}

function requireWriteScope(
  record:
    | CreateVehicleMediaRecord
    | CreateVehicleUnitRecord
    | VehicleUnit
    | {
        storeId: string | null;
        tenantId: string | null;
      },
): { storeId: string; tenantId: string } {
  if (!record.storeId) throw new VehicleInventoryDrizzleScopeError("storeId");
  if (!record.tenantId) throw new VehicleInventoryDrizzleScopeError("tenantId");

  return { storeId: record.storeId, tenantId: record.tenantId };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
