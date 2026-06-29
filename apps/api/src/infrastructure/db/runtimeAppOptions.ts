import {
  createFinanceServices,
  type FinanceServices,
} from "../../features/finance/controllers/financeServices.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
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
  createDrizzleStorefrontPageRepository,
  type DrizzleStorefrontPageClient,
} from "./storefront/drizzleStorefrontPageRepository.js";
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
import {
  createRuntimeAnalyticsServices,
  type RuntimeAnalyticsClient,
} from "../analytics/runtimeAnalyticsServices.js";
import { createRuntimeComplianceServices } from "../compliance/runtimeComplianceServices.js";
import { createRuntimeDocumentServices } from "../documents/runtimeDocumentServices.js";
import { createRuntimeFiscalServices } from "../fiscal/runtimeFiscalServices.js";
import { createAsaasPaymentProviderGateway } from "../billing/asaasPaymentProviderGateway.js";
import { createRuntimeCrmServices } from "./runtimeCrmServices.js";
import {
  createDrizzleExternalApiRepository,
  type DrizzleExternalApiClient,
} from "./externalApi/drizzleExternalApiRepository.js";
import { createRuntimeInventoryServices } from "./runtimeInventoryServices.js";
import { createRuntimeInventoryEnrichmentServices } from "./runtimeInventoryEnrichmentServices.js";

type RuntimeHttpAppOptionsInput = {
  auditDb: unknown | null;
  db: unknown;
  env: Record<string, string | undefined>;
  identityVerifier: CreateAppOptions["identityVerifier"] | null;
  objectStorage: ObjectStorage | null;
};

export function createRuntimeHttpAppOptions({
  auditDb,
  db,
  env,
  identityVerifier,
  objectStorage,
}: RuntimeHttpAppOptionsInput): CreateAppOptions {
  const audit = auditDb
    ? createDrizzleAuditSink(auditDb as unknown as DrizzleAuditSinkClient)
    : null;

  return {
    analyticsServices: createRuntimeAnalyticsServices(
      db as RuntimeAnalyticsClient,
    ),
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
    documentServices: createRuntimeDocumentServices(db, env, objectStorage),
    externalApiRepository: createDrizzleExternalApiRepository(
      db as unknown as DrizzleExternalApiClient,
    ),
    externalApiServices: createRuntimeExternalApiServices(db),
    financeServices: createRuntimeFinanceServices(db, objectStorage),
    fiscalServices: createRuntimeFiscalServices(db, env),
    ...(identityVerifier ? { identityVerifier } : {}),
    inventoryEnrichmentServices: createRuntimeInventoryEnrichmentServices(
      db,
      env,
    ),
    inventoryListingServices: createRuntimeInventoryServices(
      db,
      env,
      objectStorage,
    ),
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
    storefrontPageRepository: createDrizzleStorefrontPageRepository(
      db as DrizzleStorefrontPageClient,
    ),
    publicStorefrontCrmRepository: createDrizzleCrmRepository(
      db as unknown as DrizzleCrmClient,
    ),
    roleServices: createRuntimeRoleServices(db),
    salesServices: createRuntimeSalesServices(db, objectStorage),
    settingsServices: createRuntimeSettingsServices(db),
    storeAccessRepository: createDrizzleStoreAccessRepository(
      db as unknown as DrizzleStoreAccessClient,
    ),
  };
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

function createRuntimeFinanceServices(
  db: unknown,
  objectStorage: ObjectStorage | null,
): FinanceServices {
  return createFinanceServices({
    drizzleClient: db as DrizzleFinanceClient,
    ...(objectStorage ? { objectStorage } : {}),
  });
}
