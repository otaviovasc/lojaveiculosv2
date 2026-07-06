import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleListing } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.delete";

export type DeleteVehicleListingInput = {
  listingId: string;
  reason?: string | null | undefined;
};

export async function deleteVehicleListing(
  context: ServiceContext,
  input: DeleteVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  logVehicleServiceEvent(context, "vehicle_listing.delete.started", {
    listingId: input.listingId,
  });

  const listingRepository = getListingRepository(ports);
  const unitRepository = getUnitRepository(ports);
  const listing = await findScopedListing(
    context,
    listingRepository,
    input.listingId,
  );
  const units = await unitRepository.listByListingIds({
    listingIds: [listing.id],
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  await Promise.all(units.map((unit) => unitRepository.delete(unit)));
  const deleted = await listingRepository.delete(listing);

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.delete",
    category: "data_change",
    changes: [{ after: true, before: false, path: "listing.isDeleted" }],
    entityId: deleted.id,
    entityType: "vehicle_listing",
    metadata: {
      previousStatus: listing.status,
      reason: input.reason ?? null,
      unitCount: units.length,
    },
    permission,
    summary: "Soft deleted vehicle listing",
  });

  return deleted;
}
