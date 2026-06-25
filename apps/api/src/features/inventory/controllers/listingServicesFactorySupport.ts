import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import { type UpdateVehicleListingDetailsInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleListingDetails.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";
import {
  createClientTransactionRunner,
  createPassthroughTransactionRunner,
  type TransactionRunner,
} from "../../../shared/transaction.js";
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

export function resolveVehicleInventoryTransactionRunner(
  options: CreateInventoryListingServicesOptions,
  ports: VehicleInventoryServicePorts,
): TransactionRunner<VehicleInventoryServicePorts> {
  if (options.transactionRunner) return options.transactionRunner;
  if ("drizzleClient" in options) {
    const adapter =
      options.drizzleAdapter ?? createDrizzleVehicleInventoryRepositories;
    return createClientTransactionRunner<
      VehicleInventoryServicePorts,
      DrizzleVehicleInventoryClient
    >(options.drizzleClient, adapter);
  }
  return createPassthroughTransactionRunner(ports);
}

export function runVehicleInventoryMutation<TResult>(
  transactionRunner: TransactionRunner<VehicleInventoryServicePorts>,
  operation: (ports: VehicleInventoryServicePorts) => Promise<TResult>,
): Promise<TResult> {
  return transactionRunner.runInTransaction(operation);
}

export function detailPermissionForListingEdit(
  input: UpdateVehicleListingDetailsInput,
): PermissionKey {
  if (input.title !== undefined || input.description !== undefined) {
    return "inventory.update_description";
  }

  if (
    input.catalog !== undefined ||
    input.doors !== undefined ||
    input.engineDisplacement !== undefined ||
    input.fuelType !== undefined ||
    input.manufactureYear !== undefined ||
    input.mileageKm !== undefined ||
    input.modelYear !== undefined ||
    input.transmission !== undefined ||
    input.trimName !== undefined
  ) {
    return "inventory.update_description";
  }

  if (input.internalNotes !== undefined) {
    return "inventory.update_internal_notes";
  }
  if (input.priceCents !== undefined) return "inventory.update_price";
  if (input.status !== undefined) return "inventory.update_status";

  return "inventory.read";
}
