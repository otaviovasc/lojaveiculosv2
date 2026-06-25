import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import type { DrizzleVehicleInventoryClient } from "../../../infrastructure/db/vehicleInventory/drizzleVehicleInventoryRepository.js";
import type { TransactionRunner } from "../../../shared/transaction.js";

export type DrizzleVehicleInventoryAdapter = (
  client: DrizzleVehicleInventoryClient,
) => VehicleInventoryServicePorts;

export type CreateInventoryListingServicesOptions =
  | {
      drizzleAdapter?: never;
      drizzleClient?: never;
      ports?: VehicleInventoryServicePorts;
      transactionRunner?: TransactionRunner<VehicleInventoryServicePorts>;
    }
  | {
      drizzleAdapter?: DrizzleVehicleInventoryAdapter;
      drizzleClient: DrizzleVehicleInventoryClient;
      ports?: never;
      transactionRunner?: TransactionRunner<VehicleInventoryServicePorts>;
    };
