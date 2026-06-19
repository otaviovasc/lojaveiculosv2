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

const permission = "inventory.media_update";

export type ReorderVehicleMediaInput = {
  items: readonly { displayOrder: number; mediaId: string }[];
  listingId: string;
};

export async function reorderVehicleMedia(
  context: ServiceContext,
  input: ReorderVehicleMediaInput,
  ports?: VehicleInventoryServicePorts,
): Promise<readonly VehicleMedia[]> {
  assertPermission(context, permission);
  await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const repository = getMediaRepository(ports);
  const updated: VehicleMedia[] = [];

  logVehicleServiceEvent(context, "vehicle_media.reorder.started", {
    itemCount: input.items.length,
    listingId: input.listingId,
  });

  for (const item of input.items) {
    const media = await findScopedMedia(context, repository, {
      listingId: input.listingId,
      mediaId: item.mediaId,
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
    entityId: input.listingId,
    metadata: {
      itemCount: input.items.length,
      mediaIds: input.items.map((item) => item.mediaId),
    },
    permission,
    summary: "Reordered vehicle media gallery",
  });

  return updated;
}
