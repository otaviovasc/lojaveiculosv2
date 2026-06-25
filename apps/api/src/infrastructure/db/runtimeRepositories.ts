import * as schema from "@lojaveiculosv2/db";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  createFinanceServices,
  type FinanceServices,
} from "../../features/finance/controllers/financeServices.js";
import {
  createInternalMonitoringServices,
  type InternalMonitoringServices,
} from "../../features/internal/controllers/internalMonitoringServices.js";
import { createMarketplaceServices } from "../../features/marketplaces/controllers/marketplaceServices.js";
import { createBillingServices } from "../../features/billing/controllers/billingServices.js";
import {
  createExternalApiServices,
  type ExternalApiServices,
} from "../../features/externalApi/controllers/externalApiServices.js";
import {
  createSettingsServices,
  type SettingsServices,
} from "../../features/settings/controllers/settingsServices.js";
import {
  createSalesServices,
  type SalesServices,
} from "../../features/sales/controllers/salesServices.js";
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
import {
  createDrizzleDocumentRepository,
  type DrizzleDocumentClient,
} from "./documents/drizzleDocumentRepository.js";
import type { DrizzleInternalMonitoringClient } from "./internal/drizzleInternalMonitoringRepository.js";
import type { DrizzleFinanceClient } from "./finance/drizzleFinanceRepository.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";
import type { DrizzleSalesClient } from "./sales/drizzleSalesRepository.js";
import { createDrizzleCrmRepository } from "./crm/drizzleCrmRepository.js";
import type { DrizzleStoreSettingsClient } from "./settings/drizzleStoreSettingsRepository.js";
import {
  createDrizzleRoleManagementRepository,
  type DrizzleRoleManagementClient,
} from "./roles/drizzleRoleManagementRepository.js";
import {
  createDrizzleBillingRepository,
  type DrizzleBillingClient,
} from "./billing/drizzleBillingRepository.js";
import type { DrizzleMarketplaceClient } from "./marketplace/drizzleMarketplaceRepository.js";
import {
  createDrizzleVehicleInventoryRepositories,
  type DrizzleVehicleInventoryClient,
} from "./vehicleInventory/drizzleVehicleInventoryRepository.js";
import { createMarketplaceGatewayRegistry } from "../marketplace/marketplaceGatewayRegistry.js";
import { createRuntimeAnalyticsServices } from "../analytics/runtimeAnalyticsServices.js";
import { createRuntimeComplianceServices } from "../compliance/runtimeComplianceServices.js";
import { createRuntimeDocumentServices } from "../documents/runtimeDocumentServices.js";
import { createRuntimeFiscalServices } from "../fiscal/runtimeFiscalServices.js";
import { createAsaasPaymentProviderGateway } from "../billing/asaasPaymentProviderGateway.js";
import { createRuntimeCrmServices } from "./runtimeCrmServices.js";
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
import { createR2ObjectStorageFromEnv } from "../storage/r2ObjectStorage.js";
import { createRuntimeInventoryServices } from "./runtimeInventoryServices.js";
import { createRuntimeInventoryEnrichmentServices } from "./runtimeInventoryEnrichmentServices.js";

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
    analyticsServices: createRuntimeAnalyticsServices(db),
    ...(audit ? { audit } : {}),
    billingServices: createBillingServices({
      ports: {
        billingRepository: createDrizzleBillingRepository(
          db as DrizzleBillingClient,
        ),
        paymentProviderGateway: createAsaasPaymentProviderGateway(env),
      },
    }),
    complianceServices: createRuntimeComplianceServices(),
    crmServices: createRuntimeCrmServices(db, env),
    documentServices: createRuntimeDocumentServices(db, env),
    externalApiRepository: createDrizzleExternalApiRepository(
      db as unknown as DrizzleExternalApiClient,
    ),
    externalApiServices: createRuntimeExternalApiServices(db),
    financeServices: createRuntimeFinanceServices(db, env),
    fiscalServices: createRuntimeFiscalServices(db, env),
    ...(identityVerifier ? { identityVerifier } : {}),
    inventoryEnrichmentServices: createRuntimeInventoryEnrichmentServices(
      db,
      env,
    ),
    inventoryListingServices: createRuntimeInventoryServices(db, env),
    internalMonitoringServices: auditDb
      ? createRuntimeInternalMonitoringServices(auditDb)
      : createInternalMonitoringServices(),
    marketplaceServices: createMarketplaceServices({
      drizzleClient: db as DrizzleMarketplaceClient,
      gatewayRegistry: createMarketplaceGatewayRegistry(env),
    }),
    publicStorefrontRepository: createDrizzlePublicStorefrontRepository(
      db as unknown as DrizzlePublicStorefrontClient,
    ),
    publicStorefrontCrmRepository: createDrizzleCrmRepository(
      db as unknown as DrizzleCrmClient,
    ),
    roleServices: createRuntimeRoleServices(db),
    salesServices: createRuntimeSalesServices(db, env),
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

function createRuntimeExternalApiServices(db: unknown): ExternalApiServices {
  return createExternalApiServices({
    drizzleClient: db as DrizzleExternalApiClient,
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

function createRuntimeSalesServices(
  db: unknown,
  env: Record<string, string | undefined>,
): SalesServices {
  const mediaStorage = createR2ObjectStorageFromEnv(env);

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
