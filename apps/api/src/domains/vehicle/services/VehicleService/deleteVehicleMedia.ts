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

const permission = "inventory.media_delete";

export type DeleteVehicleMediaInput = {
  mediaId: string;
  unitId: string;
};

export async function deleteVehicleMedia(
  context: ServiceContext,
  input: DeleteVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMedia> {
  assertPermission(context, permission);
  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    input.unitId,
  );
  const repository = getMediaRepository(ports);
  const media = await findScopedMedia(context, repository, input);

  logVehicleServiceEvent(context, "vehicle_media.delete.started", {
    mediaId: input.mediaId,
    unitId: input.unitId,
  });

  const deleted = await repository.delete({
    ...media,
    updatedAt: new Date(),
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.delete",
    category: "data_change",
    changes: [{ after: true, before: false, path: "media.isDeleted" }],
    entityId: deleted.id,
    entityType: "vehicle_media",
    metadata: {
      listingId: unit.listingId,
      storageKey: deleted.storageKey,
      unitId: input.unitId,
    },
    permission,
    relatedEntities: [
      { id: input.unitId, type: "vehicle_unit" },
      { id: unit.listingId, type: "vehicle_listing" },
    ],
    summary: "Deleted vehicle media",
  });

  return deleted;
}
