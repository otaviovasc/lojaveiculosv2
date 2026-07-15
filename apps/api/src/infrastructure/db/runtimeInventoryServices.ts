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
import { createClientTransactionRunner } from "../../shared/transaction.js";
import { createRuntimeObjectStorage } from "./runtimeObjectStorage.js";
import { createDrizzleVehicleStoreBrandingReader } from "./vehicleInventory/drizzleVehicleStoreBrandingReader.js";
import {
  createDrizzleBillingQuotaGuard,
  type DrizzleBillingQuotaClient,
} from "./billing/drizzleBillingQuotaGuard.js";
import { createOpenAiVehicleAnalysisProvider } from "../vehicleEnrichment/openAiVehicleAnalysisProvider.js";
import {
  createDrizzleVehicleAuditRepository,
  type DrizzleVehicleAuditClient,
} from "./audit/drizzleVehicleAuditRepository.js";

export function createRuntimeInventoryServices(
  db: unknown,
  env: Record<string, string | undefined>,
  runtimeMediaStorage?: ObjectStorage | null,
  auditDb?: unknown | null,
): InventoryListingServices {
  const mediaStorage = runtimeMediaStorage ?? createRuntimeObjectStorage(env);
  const catalogProvider = createFipeVehicleCatalogProvider({
    ...(env.FIPE_API_BASE_URL ? { baseUrl: env.FIPE_API_BASE_URL } : {}),
    ...(env.FIPE_API_TOKEN ? { token: env.FIPE_API_TOKEN } : {}),
  });
  const resaleAnalysisProvider = createOpenAiVehicleAnalysisProvider({
    apiKey: env.API_OPENAI_KEY,
    model:
      env.API_OPENAI_INVENTORY_RESALE_MODEL ??
      env.API_OPENAI_DEFAULT_MODEL ??
      env.API_OPENAI_MODEL ??
      "gpt-5.4-mini",
  });

  const drizzleAdapter: DrizzleVehicleInventoryAdapter = (client) => ({
    ...createDrizzleVehicleInventoryRepositories(client),
    ...(auditDb
      ? {
          auditRepository: createDrizzleVehicleAuditRepository(
            auditDb as DrizzleVehicleAuditClient,
          ),
        }
      : {}),
    catalogProvider,
    catalogRepository: createDrizzleVehicleCatalogRepository(
      client as unknown as DrizzleVehicleCatalogClient,
    ),
    documentTemplateRepository: createDrizzleDocumentRepository(
      client as unknown as DrizzleDocumentClient,
    ),
    quotaGuard: createDrizzleBillingQuotaGuard(
      client as unknown as DrizzleBillingQuotaClient,
    ),
    resaleAnalysisProvider,
    storeBrandingReader: createDrizzleVehicleStoreBrandingReader(client),
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
