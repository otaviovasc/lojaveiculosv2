import { and, eq, isNull } from "drizzle-orm";
import { vehicleMedia } from "@lojaveiculosv2/db";
import type { VehicleMediaRepository } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { DrizzleRepositoryClient } from "../drizzleClient.js";
import {
  requireReturnedRow,
  toVehicleMedia,
  type InsertVehicleMediaRow,
  type VehicleMediaRow,
} from "./drizzleVehicleInventoryMappers.js";
import {
  findListingsMedia,
  findUnitsMedia,
  type DrizzleVehicleInventoryReadClient,
} from "./drizzleVehicleInventoryReads.js";
import {
  isUuid,
  requireWriteScope,
} from "./drizzleVehicleInventoryWriteSupport.js";

export type DrizzleVehicleMediaClient = DrizzleRepositoryClient<
  VehicleMediaRow,
  InsertVehicleMediaRow,
  Partial<InsertVehicleMediaRow>
>;

export function createDrizzleVehicleMediaRepository(
  db: DrizzleVehicleMediaClient & DrizzleVehicleInventoryReadClient,
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
          storageKey: record.storageKey,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          unitId: record.unitId,
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
            eq(vehicleMedia.unitId, media.unitId),
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
            eq(vehicleMedia.unitId, input.unitId),
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
    async listByUnitIds(input) {
      const media = await findUnitsMedia(db, input.unitIds);

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
            eq(vehicleMedia.unitId, media.unitId),
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
