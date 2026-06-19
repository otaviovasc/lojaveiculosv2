import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleMedia } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedMedia,
  getListingRepository,
  getMediaRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.media_delete";

export type DeleteVehicleMediaInput = {
  listingId: string;
  mediaId: string;
};

export async function deleteVehicleMedia(
  context: ServiceContext,
  input: DeleteVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleMedia> {
  assertPermission(context, permission);
  await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const repository = getMediaRepository(ports);
  const media = await findScopedMedia(context, repository, input);

  logVehicleServiceEvent(context, "vehicle_media.delete.started", {
    listingId: input.listingId,
    mediaId: input.mediaId,
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
      listingId: input.listingId,
      storageKey: deleted.storageKey,
    },
    permission,
    relatedEntities: [{ id: input.listingId, type: "vehicle_listing" }],
    summary: "Deleted vehicle media",
  });

  return deleted;
}
