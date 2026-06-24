import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingCatalog,
  VehicleFuelType,
  VehicleListingStatus,
  VehicleTransmission,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  getListingRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import { assertGenericListingStatusAllowed } from "../../policies/workflowStatusPolicy.js";

const permission = "inventory.create";
const allowedCreateStatuses = ["draft", "inactive", "available"] as const;

export type CreateVehicleListingInput = {
  catalog?: VehicleListingCatalog | null;
  description?: string | null;
  doors?: number | null;
  engineDisplacement?: string | null;
  fuelType?: VehicleFuelType | null;
  internalNotes?: string | null;
  manufactureYear?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
  plate: string | null;
  priceCents?: number | null;
  status?: VehicleListingStatus;
  title: string;
  transmission?: VehicleTransmission | null;
  trimName?: string | null;
};

function requireStoreScope(context: ServiceContext): {
  storeId: string;
  tenantId: string;
} {
  if (context.storeId && context.tenantId) {
    return { storeId: context.storeId, tenantId: context.tenantId };
  }
  throw new AuthorizationError(
    "Vehicle listing creation requires a store-scoped context.",
  );
}

async function auditPermissionDenial(
  context: ServiceContext,
  reason: "missing_scope" | "missing_permission" | "invalid_status",
): Promise<void> {
  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.create",
    category: "data_change",
    entityId: "n/a",
    failureTier: "important",
    metadata: { denialReason: reason, permission },
    outcome: "denied",
    permission,
    summary: "Vehicle listing creation denied",
  });
}

export async function createVehicleListing(
  context: ServiceContext,
  input: CreateVehicleListingInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  try {
    assertPermission(context, permission);
  } catch (error) {
    await auditPermissionDenial(context, "missing_permission");
    throw error;
  }

  let scope: { storeId: string; tenantId: string };
  try {
    scope = requireStoreScope(context);
  } catch (error) {
    await auditPermissionDenial(context, "missing_scope");
    throw error;
  }

  try {
    assertGenericListingStatusAllowed(input.status);
    if (
      input.status &&
      !(allowedCreateStatuses as readonly string[]).includes(input.status)
    ) {
      throw new AuthorizationError(
        `Listing status ${input.status} cannot be set on creation.`,
      );
    }
  } catch (error) {
    await auditPermissionDenial(context, "invalid_status");
    throw error;
  }

  logVehicleServiceEvent(context, "vehicle_listing.create.started", {
    plate: input.plate,
    requestedStatus: input.status ?? "draft",
    title: input.title,
  });

  const listing = await getListingRepository(ports).create({
    catalog: input.catalog ?? null,
    description: input.description ?? null,
    doors: input.doors ?? null,
    engineDisplacement: input.engineDisplacement ?? null,
    fuelType: input.fuelType ?? null,
    internalNotes: input.internalNotes ?? null,
    manufactureYear: input.manufactureYear ?? input.catalog?.modelYear ?? null,
    mileageKm: input.mileageKm ?? null,
    modelYear: input.modelYear ?? input.catalog?.modelYear ?? null,
    plate: input.plate,
    priceCents: input.priceCents ?? null,
    status: input.status ?? "draft",
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    title: input.title,
    transmission: input.transmission ?? null,
    trimName: input.trimName ?? input.catalog?.modelName ?? null,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.create",
    category: "data_change",
    entityId: listing.id,
    failureTier: "important",
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

export { allowedCreateStatuses };
