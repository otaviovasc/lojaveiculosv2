import type { PermissionKey } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleListing,
  VehicleListingCatalog,
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
  VehicleFuelType,
  VehicleListingStatus,
  VehicleTransmission,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  getListingRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import { assertGenericListingStatusAllowed } from "../../policies/workflowStatusPolicy.js";
import { recordListingOperationsLedger } from "../../operations/recordListingOperationsLedger.js";
import { createListingChanges } from "../../vehicleListingChanges.js";

export type UpdateVehicleListingDetailsInput = {
  catalog?: VehicleListingCatalog | null;
  commercialTags?: readonly string[];
  description?: string | null;
  doors?: number | null;
  engineAspiration?: VehicleEngineAspiration | null;
  engineDisplacement?: VehicleEngineDisplacement | null;
  fuelType?: VehicleFuelType | null;
  internalNotes?: string | null;
  listingId: string;
  manufactureYear?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
  priceCents?: number | null;
  status?: VehicleListingStatus;
  title?: string;
  transmission?: VehicleTransmission | null;
  trimName?: string | null;
  videoUrl?: string | null;
};

export async function updateVehicleListingDetails(
  context: ServiceContext,
  input: UpdateVehicleListingDetailsInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleListing> {
  const requiredPermissions = requiredPermissionsForInput(input);
  assertListingEditPermissions(context, requiredPermissions);
  assertGenericListingStatusAllowed(input.status);
  const repository = getListingRepository(ports);
  const listing = await findScopedListing(context, repository, input.listingId);
  const changes = createListingChanges(listing, input);

  logVehicleServiceEvent(context, "vehicle_listing.details.update.started", {
    changedFields: changes.map((change) => change.path),
    requiredPermissions,
    listingId: input.listingId,
  });

  const updated = changes.length
    ? await repository.save({
        ...listing,
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.catalog !== undefined ? { catalog: input.catalog } : {}),
        ...(input.commercialTags !== undefined
          ? { commercialTags: input.commercialTags }
          : {}),
        ...(input.doors !== undefined ? { doors: input.doors } : {}),
        ...(input.engineAspiration !== undefined
          ? { engineAspiration: input.engineAspiration }
          : {}),
        ...(input.engineDisplacement !== undefined
          ? { engineDisplacement: input.engineDisplacement }
          : {}),
        ...(input.fuelType !== undefined ? { fuelType: input.fuelType } : {}),
        ...(input.internalNotes !== undefined
          ? { internalNotes: input.internalNotes }
          : {}),
        ...(input.manufactureYear !== undefined
          ? { manufactureYear: input.manufactureYear }
          : {}),
        ...(input.mileageKm !== undefined
          ? { mileageKm: input.mileageKm }
          : {}),
        ...(input.modelYear !== undefined
          ? { modelYear: input.modelYear }
          : {}),
        ...(input.priceCents !== undefined
          ? { priceCents: input.priceCents }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.transmission !== undefined
          ? { transmission: input.transmission }
          : {}),
        ...(input.trimName !== undefined ? { trimName: input.trimName } : {}),
        ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
        updatedAt: new Date(),
      })
    : listing;
  await recordListingOperationsLedger(context, listing, updated, input, ports);

  await auditVehicleServiceEvent(context, {
    action: "vehicle_listing.details.update",
    category: "data_change",
    changes,
    entityId: updated.id,
    metadata: {
      changedFields: changes.map((change) => change.path),
      requiredPermissions,
    },
    permission: requiredPermissions[0] ?? "inventory.read",
    summary: "Updated vehicle listing details",
  });

  return updated;
}

function assertListingEditPermissions(
  context: ServiceContext,
  requiredPermissions: readonly PermissionKey[],
) {
  if (requiredPermissions.length === 0) {
    assertPermission(context, "inventory.read");
    return;
  }

  for (const permission of requiredPermissions) {
    assertPermission(context, permission);
  }
}

function requiredPermissionsForInput(
  input: UpdateVehicleListingDetailsInput,
): PermissionKey[] {
  const permissions: PermissionKey[] = [];

  if (input.title !== undefined || input.description !== undefined) {
    permissions.push("inventory.update_description");
  }
  if (
    input.catalog !== undefined ||
    input.doors !== undefined ||
    input.engineAspiration !== undefined ||
    input.engineDisplacement !== undefined ||
    input.fuelType !== undefined ||
    input.manufactureYear !== undefined ||
    input.mileageKm !== undefined ||
    input.modelYear !== undefined ||
    input.transmission !== undefined ||
    input.trimName !== undefined
  ) {
    permissions.push("inventory.update_description");
  }

  if (input.internalNotes !== undefined) {
    permissions.push("inventory.update_internal_notes");
  }
  if (input.priceCents !== undefined) {
    permissions.push("inventory.update_price");
  }
  if (input.commercialTags !== undefined) {
    permissions.push("inventory.update_commercial_tags");
  }
  if (input.videoUrl !== undefined) {
    permissions.push("inventory.update_video");
  }
  if (input.status !== undefined) {
    permissions.push("inventory.update_status");
  }

  return [...new Set(permissions)];
}
