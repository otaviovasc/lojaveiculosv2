import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingCatalog,
  VehicleListingStatus,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  getListingRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import { assertGenericListingStatusAllowed } from "../../policies/workflowStatusPolicy.js";

const permission = "inventory.create";

export type CreateVehicleListingInput = {
  catalog?: VehicleListingCatalog | null;
  description?: string | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
  plate: string | null;
  priceCents?: number | null;
  status?: VehicleListingStatus;
  title: string;
  trimName?: string | null;
};

export async function createVehicleListing(
  context: ServiceContext,
  input: CreateVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  assertPermission(context, permission);
  assertGenericListingStatusAllowed(input.status);

  logVehicleServiceEvent(context, "vehicle_listing.create.started", {
    plate: input.plate,
    requestedStatus: input.status ?? "draft",
    title: input.title,
  });

  const listing = await getListingRepository(ports).create({
    catalog: input.catalog ?? null,
    description: input.description ?? null,
    manufactureYear: input.manufactureYear ?? input.catalog?.modelYear ?? null,
    modelYear: input.modelYear ?? input.catalog?.modelYear ?? null,
    plate: input.plate,
    priceCents: input.priceCents ?? null,
    status: input.status ?? "draft",
    storeId: context.storeId,
    tenantId: context.tenantId,
    title: input.title,
    trimName: input.trimName ?? input.catalog?.modelName ?? null,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.create",
    category: "data_change",
    entityId: listing.id,
    metadata: {
      status: listing.status,
      title: listing.title,
      vehicleCatalogSource: listing.catalog?.source ?? null,
    },
    permission,
    summary: "Created vehicle listing",
  });

  return listing;
}
