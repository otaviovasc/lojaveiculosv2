import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import {
  createSalesServices,
  type SalesServices,
} from "../../features/sales/controllers/salesServices.js";
import type { DrizzleSalesClient } from "./sales/drizzleSalesRepository.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "./vehicleInventory/drizzleVehicleInventoryRepository.js";
import {
  createDrizzleDocumentRepository,
  type DrizzleDocumentClient,
} from "./documents/drizzleDocumentRepository.js";

export function createRuntimeSalesServices(
  db: unknown,
  mediaStorage: ObjectStorage | null,
): SalesServices {
  return createSalesServices({
    drizzleClient: db as DrizzleSalesClient,
    workflowAdapter: (client) => ({
      ...createDrizzleVehicleInventoryRepositories(
        client as unknown as DrizzleVehicleInventoryClient,
      ),
      documentTemplateRepository: createDrizzleDocumentRepository(
        client as unknown as DrizzleDocumentClient,
      ),
      ...(mediaStorage ? { mediaStorage } : {}),
    }),
  });
}
