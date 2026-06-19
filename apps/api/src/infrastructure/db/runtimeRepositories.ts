import * as schema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  createInventoryListingServices,
  type InventoryListingServices,
} from "../../features/inventory/controllers/listingServices.js";
import {
  createFinanceServices,
  type FinanceServices,
} from "../../features/finance/controllers/financeServices.js";
import {
  createInternalMonitoringServices,
  type InternalMonitoringServices,
} from "../../features/internal/controllers/internalMonitoringServices.js";
import {
  createCrmServices,
  type CrmServices,
} from "../../features/crm/controllers/crmServices.js";
import {
  createBillingServices,
  type BillingServices,
} from "../../features/billing/controllers/billingServices.js";
import {
  createExternalApiServices,
  type ExternalApiServices,
} from "../../features/externalApi/controllers/externalApiServices.js";
import {
  createSettingsServices,
  type SettingsServices,
} from "../../features/settings/controllers/settingsServices.js";
import {
  createRoleServices,
  type RoleServices,
} from "../../features/identity/controllers/roleServices.js";
import type { CreateAppOptions } from "../http/createApp.js";
import {
  createDrizzleStoreAccessRepository,
  type DrizzleStoreAccessClient,
} from "./identity/drizzleStoreAccessRepository.js";
import { createDrizzlePublicStorefrontRepository } from "./storefront/drizzlePublicStorefrontRepository.js";
import type { DrizzlePublicStorefrontClient } from "./storefront/drizzlePublicStorefrontQueryTypes.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "./audit/drizzleAuditSink.js";
import type { DrizzleInternalMonitoringClient } from "./internal/drizzleInternalMonitoringRepository.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "./vehicleInventory/drizzleVehicleInventoryRepository.js";
import type { DrizzleFinanceClient } from "./finance/drizzleFinanceRepository.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";
import type { DrizzleStoreSettingsClient } from "./settings/drizzleStoreSettingsRepository.js";
import {
  createDrizzleRoleManagementRepository,
  type DrizzleRoleManagementClient,
} from "./roles/drizzleRoleManagementRepository.js";
import type { DrizzleBillingClient } from "./billing/drizzleBillingRepository.js";
import {
  createDrizzleExternalApiRepository,
  type DrizzleExternalApiClient,
} from "./externalApi/drizzleExternalApiRepository.js";
import {
  allowsMemoryRuntimeFallback,
  createAuditDb,
  createRuntimeIdentityVerifier,
  RuntimeDatabaseConfigError,
} from "./runtimeConfig.js";

export { RuntimeDatabaseConfigError } from "./runtimeConfig.js";
import {
  createDrizzleVehicleCatalogRepository,
  type DrizzleVehicleCatalogClient,
} from "./vehicleCatalog/drizzleVehicleCatalogRepository.js";
import { createR2ObjectStorageFromEnv } from "../storage/r2ObjectStorage.js";
import { createFipeVehicleCatalogProvider } from "../catalog/fipeVehicleCatalogProvider.js";

export function createRuntimeAppOptions(
  env: Record<string, string | undefined> = process.env,
): CreateAppOptions {
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.startsWith("${{")) {
    if (!allowsMemoryRuntimeFallback(env)) {
      throw new RuntimeDatabaseConfigError(
        "DATABASE_URL must be configured before starting the API outside local/test.",
      );
    }

    return {};
  }

  const db = createProductDb(databaseUrl, env);
  const auditDb = createAuditDb(env);
  const audit = auditDb
    ? createDrizzleAuditSink(auditDb as unknown as DrizzleAuditSinkClient)
    : null;
  const identityVerifier = createRuntimeIdentityVerifier(env);

  return {
    ...(audit ? { audit } : {}),
    billingServices: createRuntimeBillingServices(db),
    crmServices: createRuntimeCrmServices(db),
    externalApiRepository: createDrizzleExternalApiRepository(
      db as unknown as DrizzleExternalApiClient,
    ),
    externalApiServices: createRuntimeExternalApiServices(db),
    financeServices: createRuntimeFinanceServices(db, env),
    ...(identityVerifier ? { identityVerifier } : {}),
    inventoryListingServices: createRuntimeInventoryServices(db, env),
    internalMonitoringServices: auditDb
      ? createRuntimeInternalMonitoringServices(auditDb)
      : createInternalMonitoringServices(),
    publicStorefrontRepository: createDrizzlePublicStorefrontRepository(
      db as unknown as DrizzlePublicStorefrontClient,
    ),
    roleServices: createRuntimeRoleServices(db),
    settingsServices: createRuntimeSettingsServices(db),
    storeAccessRepository: createDrizzleStoreAccessRepository(
      db as unknown as DrizzleStoreAccessClient,
    ),
  };
}

function createProductDb(
  databaseUrl: string,
  env: Record<string, string | undefined>,
) {
  const client = postgres(databaseUrl, {
    max: Number(env.DB_POOL_MAX ?? 5),
  });

  return drizzle(client, { schema });
}

function createRuntimeBillingServices(db: unknown): BillingServices {
  return createBillingServices({
    drizzleClient: db as DrizzleBillingClient,
  });
}

function createRuntimeExternalApiServices(db: unknown): ExternalApiServices {
  return createExternalApiServices({
    drizzleClient: db as DrizzleExternalApiClient,
  });
}

function createRuntimeInventoryServices(
  db: unknown,
  env: Record<string, string | undefined>,
): InventoryListingServices {
  const mediaStorage = createR2ObjectStorageFromEnv(env);
  const catalogProvider = createFipeVehicleCatalogProvider({
    ...(env.FIPE_API_BASE_URL ? { baseUrl: env.FIPE_API_BASE_URL } : {}),
    ...(env.FIPE_API_TOKEN ? { token: env.FIPE_API_TOKEN } : {}),
  });

  return createInventoryListingServices({
    drizzleAdapter: (client) => ({
      ...createDrizzleVehicleInventoryRepositories(client),
      catalogRepository: createDrizzleVehicleCatalogRepository(
        client as unknown as DrizzleVehicleCatalogClient,
      ),
      catalogProvider,
      ...(mediaStorage ? { mediaStorage } : {}),
    }),
    drizzleClient: db as DrizzleVehicleInventoryClient,
  });
}

function createRuntimeInternalMonitoringServices(
  auditDb: unknown,
): InternalMonitoringServices {
  return createInternalMonitoringServices({
    auditDrizzleClient: auditDb as DrizzleInternalMonitoringClient,
  });
}

function createRuntimeSettingsServices(db: unknown): SettingsServices {
  return createSettingsServices({
    drizzleClient: db as DrizzleStoreSettingsClient,
  });
}

function createRuntimeRoleServices(db: unknown): RoleServices {
  return createRoleServices(
    createDrizzleRoleManagementRepository(
      db as unknown as DrizzleRoleManagementClient,
    ),
  );
}

function createRuntimeCrmServices(db: unknown): CrmServices {
  return createCrmServices({ drizzleClient: db as DrizzleCrmClient });
}

function createRuntimeFinanceServices(
  db: unknown,
  env: Record<string, string | undefined>,
): FinanceServices {
  const objectStorage = createR2ObjectStorageFromEnv(env);

  return createFinanceServices({
    drizzleClient: db as DrizzleFinanceClient,
    ...(objectStorage ? { objectStorage } : {}),
  });
}
