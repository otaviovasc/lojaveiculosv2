import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleMedia } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedMedia,
  findScopedUnitById,
  getMediaRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.media_update";

export type ReorderVehicleMediaInput = {
  items: readonly { displayOrder: number; mediaId: string }[];
  unitId: string;
};

export async function reorderVehicleMedia(
  context: ServiceContext,
  input: ReorderVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<readonly VehicleMedia[]> {
  assertPermission(context, permission);
  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    input.unitId,
  );
  const repository = getMediaRepository(ports);
  const updated: VehicleMedia[] = [];

  logVehicleServiceEvent(context, "vehicle_media.reorder.started", {
    itemCount: input.items.length,
    unitId: input.unitId,
  });

  for (const item of input.items) {
    const media = await findScopedMedia(context, repository, {
      mediaId: item.mediaId,
      unitId: input.unitId,
    });
    if (media.displayOrder === item.displayOrder) {
      updated.push(media);
      continue;
    }
    updated.push(
      await repository.save({
        ...media,
        displayOrder: item.displayOrder,
        updatedAt: new Date(),
      }),
    );
  }

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.reorder",
    category: "data_change",
    entityId: input.unitId,
    entityType: "vehicle_unit",
    metadata: {
      itemCount: input.items.length,
      listingId: unit.listingId,
      mediaIds: input.items.map((item) => item.mediaId),
      unitId: input.unitId,
    },
    permission,
    relatedEntities: [{ id: unit.listingId, type: "vehicle_listing" }],
    summary: "Reordered vehicle media gallery",
  });

  return updated;
}
