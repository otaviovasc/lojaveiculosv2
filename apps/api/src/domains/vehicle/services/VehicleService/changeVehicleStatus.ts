import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingStatus,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.update_status";

export type ChangeVehicleStatusInput = {
  listingId: string;
  status: VehicleListingStatus;
};

export async function changeVehicleStatus(
  context: ServiceContext,
  input: ChangeVehicleStatusInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  logVehicleServiceEvent(context, "vehicle_listing.status.change.started", {
    listingId: input.listingId,
    status: input.status,
  });

  const repository = getListingRepository(ports);
  const listing = await findScopedListing(context, repository, input.listingId);
  const updated = await repository.save({
    ...listing,
    status: input.status,
    updatedAt: new Date(),
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.status.change",
    category: "data_change",
    changes: [
      {
        after: input.status,
        before: listing.status,
        path: "status",
      },
    ],
    entityId: updated.id,
    permission,
    summary: "Changed vehicle listing status",
  });

  return updated;
}
