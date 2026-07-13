import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleUnit,
} from "../../ports/vehicleInventoryRepository.js";
import { assertStoreUserActor } from "../../authorization/storeWorkflowActor.js";
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
  assertStoreUserActor(context);

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
  assertVehicleListingCanBeDeleted(listing, units);

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

function assertVehicleListingCanBeDeleted(
  listing: VehicleListing,
  units: readonly VehicleUnit[],
) {
  const unitStatuses = new Set(units.map((unit) => unit.status));
  const blockingStatuses = vehicleListingDeletionBlockingStatuses.filter(
    (status) =>
      unitStatuses.has(status) ||
      (status === "sold" && listing.status === "sold_out"),
  );
  if (blockingStatuses.length > 0) {
    throw new VehicleListingDeletionStateError(blockingStatuses);
  }
}

const vehicleListingDeletionBlockingStatuses = [
  "reserved",
  "sold",
  "delivered",
] as const satisfies readonly VehicleUnit["status"][];

type VehicleListingDeletionBlockingStatus =
  (typeof vehicleListingDeletionBlockingStatuses)[number];

export class VehicleListingDeletionStateError extends Error {
  constructor(
    readonly blockingStatuses: readonly VehicleListingDeletionBlockingStatus[],
  ) {
    super(
      "Vehicle listing cannot be deleted while units are reserved, sold, or delivered.",
    );
    this.name = "VehicleListingDeletionStateError";
  }
}
