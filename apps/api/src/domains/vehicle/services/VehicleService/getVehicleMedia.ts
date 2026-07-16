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

const permission = "inventory.read";

export type GetVehicleMediaInput = {
  mediaId: string;
  unitId: string;
};

export async function getVehicleMedia(
  context: ServiceContext,
  input: GetVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMedia> {
  assertPermission(context, permission);

  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    input.unitId,
  );
  const media = await findScopedMedia(
    context,
    getMediaRepository(ports),
    input,
  );

  logVehicleServiceEvent(context, "vehicle_media.get.started", {
    mediaId: input.mediaId,
    unitId: input.unitId,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_media.get",
    category: "data_access",
    entityId: media.id,
    entityType: "vehicle_media",
    metadata: { kind: media.kind, unitId: input.unitId },
    permission,
    relatedEntities: [
      { id: input.unitId, type: "vehicle_unit" },
      { id: unit.listingId, type: "vehicle_listing" },
    ],
    summary: "Read vehicle media",
  });

  return media;
}
