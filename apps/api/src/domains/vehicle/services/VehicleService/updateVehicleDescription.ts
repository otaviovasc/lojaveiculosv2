import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleListing } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.update_description";

export type UpdateVehicleDescriptionInput = {
  description: string | null;
  listingId: string;
};

export async function updateVehicleDescription(
  context: ServiceContext,
  input: UpdateVehicleDescriptionInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  logVehicleServiceEvent(
    context,
    "vehicle_listing.description.update.started",
    {
      listingId: input.listingId,
    },
  );

  const repository = getListingRepository(ports);
  const listing = await findScopedListing(context, repository, input.listingId);
  const updated = await repository.save({
    ...listing,
    description: input.description,
    updatedAt: new Date(),
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.description.update",
    category: "data_change",
    changes: [
      {
        after: input.description,
        before: listing.description,
        path: "description",
      },
    ],
    entityId: updated.id,
    permission,
    summary: "Updated vehicle listing description",
  });

  return updated;
}
