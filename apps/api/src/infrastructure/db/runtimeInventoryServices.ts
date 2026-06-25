import {
  createInventoryListingServices,
  type DrizzleVehicleInventoryAdapter,
  type InventoryListingServices,
} from "../../features/inventory/controllers/listingServices.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "./vehicleInventory/drizzleVehicleInventoryRepository.js";
import {
  createDrizzleDocumentRepository,
  type DrizzleDocumentClient,
} from "./documents/drizzleDocumentRepository.js";
import {
  createDrizzleVehicleCatalogRepository,
  type DrizzleVehicleCatalogClient,
} from "./vehicleCatalog/drizzleVehicleCatalogRepository.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import { createFipeVehicleCatalogProvider } from "../catalog/fipeVehicleCatalogProvider.js";
import { createR2ObjectStorageFromEnv } from "../storage/r2ObjectStorage.js";
import { createClientTransactionRunner } from "../../shared/transaction.js";

export function createRuntimeInventoryServices(
  db: unknown,
  env: Record<string, string | undefined>,
  runtimeMediaStorage?: ObjectStorage | null,
): InventoryListingServices {
  const mediaStorage = runtimeMediaStorage ?? createR2ObjectStorageFromEnv(env);
  const catalogProvider = createFipeVehicleCatalogProvider({
    ...(env.FIPE_API_BASE_URL ? { baseUrl: env.FIPE_API_BASE_URL } : {}),
    ...(env.FIPE_API_TOKEN ? { token: env.FIPE_API_TOKEN } : {}),
  });

  const drizzleAdapter: DrizzleVehicleInventoryAdapter = (client) => ({
    ...createDrizzleVehicleInventoryRepositories(client),
    catalogProvider,
    catalogRepository: createDrizzleVehicleCatalogRepository(
      client as unknown as DrizzleVehicleCatalogClient,
    ),
    documentTemplateRepository: createDrizzleDocumentRepository(
      client as unknown as DrizzleDocumentClient,
    ),
    ...(mediaStorage ? { mediaStorage } : {}),
  });

  return createInventoryListingServices({
    drizzleAdapter,
    drizzleClient: db as DrizzleVehicleInventoryClient,
    transactionRunner: createClientTransactionRunner(
      db as DrizzleVehicleInventoryClient,
      drizzleAdapter,
    ),
  });
}
