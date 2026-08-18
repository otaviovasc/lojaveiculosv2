import { createInternalMonitoringServices } from "../../features/internal/controllers/internalMonitoringServices.js";
import { createMarketplaceServices } from "../../features/marketplaces/controllers/marketplaceServices.js";
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
import { resolveStoreEntitlements } from "./identity/drizzleStoreEntitlementReads.js";
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
import { createPinoServiceLogger } from "../logging/createPinoServiceLogger.js";
import type { DrizzleCrmClient } from "./crm/drizzleCrmRepository.js";
import { createDrizzleCrmRepository } from "./crm/drizzleCrmRepository.js";
import { createDrizzleCrmPipelineRepository } from "./crm/drizzleCrmPipelineRepository.js";
import { createDrizzleCrmCoreRepository } from "./crm/drizzleCrmCoreRepository.js";
import type { DrizzleMarketplaceClient } from "./marketplace/drizzleMarketplaceRepository.js";
import { createDrizzleMarketplaceOAuthStateStore } from "./marketplace/drizzleMarketplaceOAuthStateStore.js";
import { createMarketplaceGatewayRegistry } from "../marketplace/marketplaceGatewayRegistry.js";
import { createMarketplaceOAuthRedirectUriResolver } from "../marketplace/marketplaceOAuthRedirectUris.js";
import {
  createRuntimeAnalyticsServices,
  type RuntimeAnalyticsClient,
} from "../analytics/runtimeAnalyticsServices.js";
import { createRuntimeComplianceServices } from "../compliance/runtimeComplianceServices.js";
import { createRuntimeDocumentServices } from "../documents/runtimeDocumentServices.js";
import { createRuntimeFiscalServices } from "../fiscal/runtimeFiscalServices.js";
import { createRuntimeCrmServices } from "./runtimeCrmServices.js";
import { createRuntimeCrmFinancialProductTransactionRunner } from "./runtimeCrmFinancialProductTransaction.js";
import { createRuntimeInventoryServices } from "./runtimeInventoryServices.js";
import { createRuntimeInventoryEnrichmentServices } from "./runtimeInventoryEnrichmentServices.js";
import { createRuntimeAutomationServices } from "./runtimeAutomationServices.js";
import { createRuntimeObjectStorage } from "./runtimeObjectStorage.js";
import { createRuntimeFinanceServices } from "./runtimeFinanceServices.js";
import { createRuntimeSalesServices } from "./runtimeSalesServices.js";
import type { RuntimeHttpAppOptionsInput } from "./runtimeAppOptionsTypes.js";
import { createRuntimeCredereFinancingServices } from "../financing/runtimeCredereFinancingServices.js";
import { createDrizzleCrmBotEntitlementResolver } from "./crm/resolveCrmBotEntitlements.js";
import { createRuntimeOlxCrmOnboarding } from "../marketplace/runtimeOlxCrmOnboarding.js";
import { createRuntimeExternalBotManager } from "../crm/bot/runtimeExternalBotManager.js";
import {
  createBillingServices,
  createDrizzleBillingQuotaGuard,
  createRuntimeBillingServicePorts,
  createRuntimeExternalApiServices,
  createRuntimeRoleServices,
  createRuntimeSettingsServices,
} from "./runtimeAppOptionServiceFactories.js";
import type { DrizzleBillingQuotaClient } from "./billing/drizzleBillingQuotaGuard.js";
import {
  createDrizzleExternalApiRepository,
  type DrizzleExternalApiClient,
} from "./externalApi/drizzleExternalApiRepository.js";

export { createRuntimeBillingServicePorts } from "./runtimeAppOptionServiceFactories.js";
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
  const financingServices = createRuntimeCredereFinancingServices(db, env);
  const marketplaceDb = db as DrizzleMarketplaceClient;
  const crmDb = db as DrizzleCrmClient;
  const externalBotManager = createRuntimeExternalBotManager(db, env);
  return {
    logger: createPinoServiceLogger({
      baseMetadata: {
        environment: env.APP_ENV ?? "unknown",
        service: "api",
      },
    }),
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
        crmRealtimeBroker.olxWebhookSecurity,
      ),
    crmCoreRepository: createDrizzleCrmCoreRepository(crmDb),
    crmRealtimeBroker,
    ...(externalBotManager ? { externalBotManager } : {}),
    resolveCrmBotEntitlements: createDrizzleCrmBotEntitlementResolver(
      db as DrizzleCrmClient,
    ),
    crmServices: createRuntimeCrmServices(
      db,
      env,
      crmRealtimeBroker,
      runtimeObjectStorage,
      crmRealtimeBroker.olxWebhookSecurity,
      externalBotManager,
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
    ...(financingServices ? { financingServices } : {}),
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
      auditDb,
    ),
    internalMonitoringServices: auditDb
      ? createInternalMonitoringServices({
          auditDrizzleClient: auditDb as DrizzleInternalMonitoringClient,
        })
      : createInternalMonitoringServices(),
    marketplaceServices: createMarketplaceServices({
      drizzleClient: marketplaceDb,
      gatewayRegistry: createMarketplaceGatewayRegistry(env),
      isMarketplaceEntitled: async ({ now, storeId }) =>
        (
          await resolveStoreEntitlements(
            db as DrizzleAccountProvisioningClient,
            storeId,
            now,
          )
        ).includes("marketplace"),
      oauthRedirectUri: createMarketplaceOAuthRedirectUriResolver(env),
      oauthStateStore: createDrizzleMarketplaceOAuthStateStore(
        marketplaceDb,
        env,
      ),
      olxCrmOnboarding: createRuntimeOlxCrmOnboarding(crmDb, env),
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
    publicStorefrontCrmPipelineRepository: createDrizzleCrmPipelineRepository(
      db as unknown as DrizzleCrmClient,
    ),
    publicStorefrontCrmTransaction: async (action) =>
      crmDb.transaction((tx) =>
        action({
          crmPipelineRepository: createDrizzleCrmPipelineRepository(
            tx as unknown as DrizzleCrmClient,
          ),
          crmRepository: createDrizzleCrmRepository(
            tx as unknown as DrizzleCrmClient,
          ),
        }),
      ),
    roleServices: createRuntimeRoleServices(db),
    salesServices: createRuntimeSalesServices(db, runtimeObjectStorage),
    settingsServices: createRuntimeSettingsServices(db),
    storeAccessRepository: createDrizzleStoreAccessRepository(
      db as unknown as DrizzleStoreAccessClient,
    ),
  };
}
