import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleColor } from "@lojaveiculosv2/shared";
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
  colorName?: VehicleColor | null;
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
    colorName: input.colorName ?? null,
    listingId: listing.id,
    plate: input.plate ?? listing.plate,
    status:
      listing.status === "in_preparation" ? "in_preparation" : "available",
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
    entityId: unit.id,
    entityType: "vehicle_unit",
    metadata: {
      listingId: listing.id,
      status: unit.status,
      unitId: unit.id,
    },
    permission,
    relatedEntities: [{ id: listing.id, type: "vehicle_listing" }],
    summary: "Attached vehicle unit to listing",
  });

  return unit;
}
