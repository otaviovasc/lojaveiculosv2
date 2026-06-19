import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import { type UpdateVehicleListingDetailsInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleListingDetails.js";
import { createDrizzleVehicleInventoryRepositories } from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";
import { createMemoryVehicleInventoryPorts } from "../adapters/memory/vehicleInventoryPorts.js";
import type { CreateInventoryListingServicesOptions } from "./listingServices.js";

export function resolveVehicleInventoryPorts(
  options: CreateInventoryListingServicesOptions,
): VehicleInventoryServicePorts {
  if ("ports" in options && options.ports) return options.ports;

  if ("drizzleClient" in options) {
    const adapter =
      options.drizzleAdapter ?? createDrizzleVehicleInventoryRepositories;
    return adapter(options.drizzleClient);
  }

  return createMemoryVehicleInventoryPorts();
}

export function detailPermissionForListingEdit(
  input: UpdateVehicleListingDetailsInput,
): PermissionKey {
  if (input.title !== undefined || input.description !== undefined) {
    return "inventory.update_description";
  }

  if (input.priceCents !== undefined) return "inventory.update_price";
  if (input.status !== undefined) return "inventory.update_status";

  return "inventory.read";
}
