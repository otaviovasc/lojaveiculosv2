import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingStatus,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  actorUserId,
  findScopedListing,
  getListingRepository,
  getOperationsRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import { assertGenericListingStatusAllowed } from "../../policies/workflowStatusPolicy.js";

const permission = "inventory.update_status";

export type ChangeVehicleStatusInput = {
  listingId: string;
  reason?: string | null | undefined;
  status: VehicleListingStatus;
};

export async function changeVehicleStatus(
  context: ServiceContext,
  input: ChangeVehicleStatusInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);
  assertGenericListingStatusAllowed(input.status);

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
  await getOperationsRepository(ports).createStatusHistory({
    actorUserId: actorUserId(context),
    fromStatus: listing.status,
    listingId: listing.id,
    reason: input.reason ?? null,
    storeId: context.storeId,
    target: "listing",
    tenantId: context.tenantId,
    toStatus: input.status,
    unitId: null,
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
    metadata: { reason: input.reason ?? null },
    summary: "Changed vehicle listing status",
  });

  return updated;
}
