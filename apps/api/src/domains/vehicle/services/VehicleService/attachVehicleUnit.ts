import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleUnit } from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.create";

export type AttachVehicleUnitInput = {
  listingId: string;
  plate?: string | null;
  stockNumber?: string | null;
  vin?: string | null;
};

export async function attachVehicleUnit(
  context: ServiceContext,
  input: AttachVehicleUnitInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleUnit> {
  assertPermission(context, permission);

  logVehicleServiceEvent(context, "vehicle_unit.attach.started", {
    listingId: input.listingId,
    stockNumber: input.stockNumber ?? null,
  });

  const listingRepository = getListingRepository(ports);
  const listing = await findScopedListing(
    context,
    listingRepository,
    input.listingId,
  );
  const unit = await getUnitRepository(ports).create({
    listingId: listing.id,
    plate: input.plate ?? listing.plate,
    status: "available",
    stockNumber: input.stockNumber ?? null,
    storeId: context.storeId,
    tenantId: context.tenantId,
    vin: input.vin ?? null,
  });

  await listingRepository.save({
    ...listing,
    unitIds: [...listing.unitIds, unit.id],
    updatedAt: new Date(),
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_unit.attach",
    category: "data_change",
    entityId: listing.id,
    metadata: {
      unitId: unit.id,
    },
    permission,
    summary: "Attached vehicle unit to listing",
  });

  return unit;
}
