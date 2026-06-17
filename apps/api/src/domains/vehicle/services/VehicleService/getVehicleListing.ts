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

const permission = "inventory.read";

export type GetVehicleListingInput = {
  listingId: string;
};

export async function getVehicleListing(
  context: ServiceContext,
  input: GetVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  logVehicleServiceEvent(context, "vehicle_listing.get.started", {
    listingId: input.listingId,
  });

  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.get",
    category: "data_access",
    entityId: listing.id,
    metadata: {
      status: listing.status,
    },
    permission,
    summary: "Read vehicle listing",
  });

  return listing;
}
