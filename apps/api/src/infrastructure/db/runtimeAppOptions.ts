import {
  createFinanceServices,
  type FinanceServices,
} from "../../features/finance/controllers/financeServices.js";
import type { BillingServicePorts } from "../../domains/billing/services/BillingService/serviceSupport.js";
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
  createRoleServices,
  type RoleServices,
} from "../../features/identity/controllers/roleServices.js";
import { createAccountProvisioningServices } from "../../features/identity/controllers/accountProvisioningServices.js";
import type { CreateAppOptions } from "../http/createApp.js";
import {
  createDrizzleStoreAccessRepository,
  type DrizzleStoreAccessClient,
} from "./identity/drizzleStoreAccessRepository.js";
import {
  createDrizzleAccountProvisioningRepository,
  type DrizzleAccountProvisioningClient,
} from "./identity/drizzleAccountProvisioningRepository.js";
import { createDrizzlePublicStorefrontRepository } from "./storefront/drizzlePublicStorefrontRepository.js";
import type { DrizzlePublicStorefrontClient } from "./storefront/drizzlePublicStorefrontQueryTypes.js";
import {
  createDrizzleStorefrontPageRepository,
  type DrizzleStorefrontPageClient,
} from "./storefront/drizzleStorefrontPageRepository.js";
import { createRuntimeStorefrontMediaServices } from "./runtimeStorefrontMediaServices.js";
import {
  createDrizzleAuditSink,
  type DrizzleAuditSinkClient,
} from "./audit/drizzleAuditSink.js";
import type { DrizzleInternalMonitoringClient } from "./internal/drizzleInternalMonitoringRepository.js";
import type { DrizzleFinanceClient } from "./finance/drizzleFinanceRepository.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";
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
import { createDrizzleBillingProviderRepository } from "./billing/drizzleBillingProviderRepository.js";
import { createDrizzleBillingWebhookRepository } from "./billing/drizzleBillingWebhookRepository.js";
import {
  createDrizzleBillingQuotaGuard,
  type DrizzleBillingQuotaClient,
} from "./billing/drizzleBillingQuotaGuard.js";
import type { DrizzleMarketplaceClient } from "./marketplace/drizzleMarketplaceRepository.js";
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
import { createRuntimeCrmFinancialProductTransactionRunner } from "./runtimeCrmFinancialProductTransaction.js";
import {
  createDrizzleExternalApiRepository,
  type DrizzleExternalApiClient,
} from "./externalApi/drizzleExternalApiRepository.js";
import { createRuntimeInventoryServices } from "./runtimeInventoryServices.js";
import { createRuntimeInventoryEnrichmentServices } from "./runtimeInventoryEnrichmentServices.js";
import { createRuntimeAutomationServices } from "./runtimeAutomationServices.js";
import { createRuntimeObjectStorage } from "./runtimeObjectStorage.js";
import { createRuntimeSalesServices } from "./runtimeSalesServices.js";
import type { RuntimeHttpAppOptionsInput } from "./runtimeAppOptionsTypes.js";

export function createRuntimeHttpAppOptions({
  auditDb,
  clerkAccountProviders = {},
  crmRealtimeBroker,
  db,
  env,
  identityVerifier,
  objectStorage,
}: RuntimeHttpAppOptionsInput): CreateAppOptions {
  const audit = auditDb
    ? createDrizzleAuditSink(auditDb as unknown as DrizzleAuditSinkClient)
    : null;
  const runtimeObjectStorage = objectStorage ?? createRuntimeObjectStorage(env);
  return {
    analyticsServices: createRuntimeAnalyticsServices(
      db as RuntimeAnalyticsClient,
    ),
    automationServices: createRuntimeAutomationServices(db),
    ...(audit ? { audit } : {}),
    accountProvisioningServices: createAccountProvisioningServices({
      ...(clerkAccountProviders.invitationSender
        ? { invitationSender: clerkAccountProviders.invitationSender }
        : {}),
      repository: createDrizzleAccountProvisioningRepository(
        db as DrizzleAccountProvisioningClient,
      ),
      quotaGuard: createDrizzleBillingQuotaGuard(
        db as DrizzleBillingQuotaClient,
      ),
    }),
    billingServices: createBillingServices({
      ports: createRuntimeBillingServicePorts(db, env),
    }),
    complianceServices: createRuntimeComplianceServices(),
    crmFinancialProductTransactionRunner:
      createRuntimeCrmFinancialProductTransactionRunner(
        db,
        env,
        crmRealtimeBroker,
        runtimeObjectStorage,
      ),
    crmRealtimeBroker,
    crmServices: createRuntimeCrmServices(
      db,
      env,
      crmRealtimeBroker,
      runtimeObjectStorage,
    ),
    documentServices: createRuntimeDocumentServices(
      db,
      env,
      runtimeObjectStorage,
    ),
    externalApiRepository: createDrizzleExternalApiRepository(
      db as unknown as DrizzleExternalApiClient,
    ),
    externalApiServices: createRuntimeExternalApiServices(db),
    financeServices: createRuntimeFinanceServices(db, runtimeObjectStorage),
    fiscalServices: createRuntimeFiscalServices(db, env),
    ...(identityVerifier ? { identityVerifier } : {}),
    ...(clerkAccountProviders.clerkUserProfileProvider
      ? {
          clerkUserProfileProvider:
            clerkAccountProviders.clerkUserProfileProvider,
        }
      : {}),
    inventoryEnrichmentServices: createRuntimeInventoryEnrichmentServices(
      db,
      env,
    ),
    inventoryListingServices: createRuntimeInventoryServices(
      db,
      env,
      runtimeObjectStorage,
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
    storefrontMediaServices: createRuntimeStorefrontMediaServices(
      db,
      runtimeObjectStorage,
    ),
    publicStorefrontCrmRepository: createDrizzleCrmRepository(
      db as unknown as DrizzleCrmClient,
    ),
    roleServices: createRuntimeRoleServices(db),
    salesServices: createRuntimeSalesServices(db, runtimeObjectStorage),
    settingsServices: createRuntimeSettingsServices(db),
    storeAccessRepository: createDrizzleStoreAccessRepository(
      db as unknown as DrizzleStoreAccessClient,
    ),
  };
}
export function createRuntimeBillingServicePorts(
  db: unknown,
  env: Record<string, string | undefined>,
): BillingServicePorts {
  const publicAppUrl = env.PUBLIC_APP_URL?.trim();

  return {
    billingProviderRepository: createDrizzleBillingProviderRepository(
      db as DrizzleBillingClient,
    ),
    billingRepository: createDrizzleBillingRepository(
      db as DrizzleBillingClient,
    ),
    billingWebhookRepository: createDrizzleBillingWebhookRepository(
      db as DrizzleBillingClient,
    ),
    environment: env.APP_ENV ?? env.NODE_ENV ?? "production",
    paymentProviderGateway: createAsaasPaymentProviderGateway(env),
    ...(publicAppUrl ? { publicAppUrl } : {}),
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

function createRuntimeFinanceServices(
  db: unknown,
  objectStorage: ObjectStorage | null,
): FinanceServices {
  return createFinanceServices({
    drizzleClient: db as DrizzleFinanceClient,
    ...(objectStorage ? { objectStorage } : {}),
  });
}
