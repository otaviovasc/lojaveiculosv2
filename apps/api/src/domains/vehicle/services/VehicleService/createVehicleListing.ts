import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingStatus,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  getListingRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.create";

export type CreateVehicleListingInput = {
  description?: string | null;
  plate: string | null;
  priceCents?: number | null;
  status?: VehicleListingStatus;
  title: string;
};

export async function createVehicleListing(
  context: ServiceContext,
  input: CreateVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);

  logVehicleServiceEvent(context, "vehicle_listing.create.started", {
    plate: input.plate,
    requestedStatus: input.status ?? "draft",
    title: input.title,
  });

  const listing = await getListingRepository(ports).create({
    description: input.description ?? null,
    plate: input.plate,
    priceCents: input.priceCents ?? null,
    status: input.status ?? "draft",
    storeId: context.storeId,
    tenantId: context.tenantId,
    title: input.title,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.create",
    category: "data_change",
    entityId: listing.id,
    metadata: {
      status: listing.status,
      title: listing.title,
    },
    permission,
    summary: "Created vehicle listing",
  });

  return listing;
}
