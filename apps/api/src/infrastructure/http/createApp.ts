import { Hono, type Context } from "hono";
import { createAnalyticsFeature } from "../../features/analytics/controllers/analytics.controller.js";
import { createComplianceFeature } from "../../features/compliance/controllers/compliance.controller.js";
import { createDocumentsFeature } from "../../features/documents/controllers/documents.controller.js";
import { createExternalApiFeature } from "../../features/externalApi/controllers/externalApi.controller.js";
import { createInternalMonitoringFeature } from "../../features/internal/controllers/internalMonitoring.controller.js";
import { createMarketplaceFeature } from "../../features/marketplaces/controllers/marketplace.controller.js";
import { docsFeature } from "../../features/docs/controllers/docs.controller.js";
import { createCrmFeature } from "../../features/crm/controllers/crm.controller.js";
import { createFinanceFeature } from "../../features/finance/controllers/finance.controller.js";
import { installCredereFinancingRoutes } from "../../features/financing/controllers/installCredereFinancingRoutes.js";
import { createAgencyFeature } from "../../features/agency/controllers/agency.controller.js";
import { createBillingFeature } from "../../features/billing/controllers/billing.controller.js";
import { createInventoryFeature } from "../../features/inventory/controllers/vehicle.controller.js";
import { createStorefrontFeature } from "../../features/storefront/controllers/storefront.controller.js";
import { createStorefrontPageServices } from "../../features/storefront/controllers/storefrontPageServices.js";
import { createStorefrontMediaFeature } from "../../features/storefront/controllers/storefrontMedia.controller.js";
import { createStorefrontPagesFeature } from "../../features/storefront/controllers/storefrontPages.controller.js";
import { createSettingsFeature } from "../../features/settings/controllers/settings.controller.js";
import { createSalesFeature } from "../../features/sales/controllers/sales.controller.js";
import { createRolesFeature } from "../../features/identity/controllers/roles.controller.js";
import type { CreateAppOptions } from "./createAppOptions.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";
import { createHttpAccountContextFactory } from "./createHttpAccountContextFactory.js";
import { createAgencyAccountContextFactory } from "./createAgencyAccountContextFactory.js";
import { createExternalApiRequestLogger } from "./externalApiRequestLogger.js";
import { installAccountProvisioningRoutes } from "./installAccountProvisioningRoutes.js";
import { installHealthRoutes } from "./installHealthRoutes.js";
import { installHttpMiddleware } from "./installHttpMiddleware.js";
import { installAutomationRoutes } from "./installAutomationRoutes.js";
import { createLocalHttpLogger } from "./localHttpLogger.js";
import { createCrmWebhookContextFactory } from "./crmWebhookContextFactory.js";
import { createBillingWebhookContextFactory } from "./billingWebhookContextFactory.js";
import { installFiscalRoutes } from "./installFiscalRoutes.js";
export type { CreateAppOptions } from "./createAppOptions.js";
export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();
  installHttpMiddleware(app);
  app.use("*", createLocalHttpLogger());
  app.use(
    "/api/v1/*",
    createExternalApiRequestLogger(options.externalApiRepository),
  );
  const ctxConfig = {
    ...(options.audit ? { audit: options.audit } : {}),
    ...(options.identityVerifier
      ? { identityVerifier: options.identityVerifier }
      : {}),
    ...(options.externalApiRepository
      ? { externalApiRepository: options.externalApiRepository }
      : {}),
    ...(options.storeAccessRepository
      ? { repository: options.storeAccessRepository }
      : {}),
    ...(options.logger ? { logger: options.logger } : {}),
  };
  const storefrontOptions = options.publicStorefrontRepository
    ? {
        ...(options.audit ? { audit: options.audit } : {}),
        ...(options.publicStorefrontCrmRepository
          ? { crmRepository: options.publicStorefrontCrmRepository }
          : {}),
        ...(options.storefrontPageRepository
          ? { pageRepository: options.storefrontPageRepository }
          : {}),
        repository: options.publicStorefrontRepository,
      }
    : {};
  const contextFactory = (c: Context) => createHttpServiceContext(c, ctxConfig);
  const accountContextFactory = createHttpAccountContextFactory(options);
  app.route("/", docsFeature);
  installHealthRoutes(app, options.readiness);
  installAccountProvisioningRoutes(app, options, contextFactory);
  app.route(
    "/api/v1/public/storefront",
    createStorefrontFeature(storefrontOptions),
  );
  app.route(
    "/api/v1/storefront",
    createStorefrontPagesFeature({
      contextFactory,
      ...(options.storefrontPageRepository
        ? {
            services: createStorefrontPageServices({
              repository: options.storefrontPageRepository,
            }),
          }
        : {}),
    }),
  );
  app.route(
    "/api/v1/storefront",
    createStorefrontMediaFeature({
      contextFactory,
      ...(options.storefrontMediaServices
        ? { services: options.storefrontMediaServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/inventory",
    createInventoryFeature({
      contextFactory,
      ...(options.inventoryListingServices
        ? { services: options.inventoryListingServices }
        : {}),
      ...(options.inventoryEnrichmentServices
        ? { enrichmentServices: options.inventoryEnrichmentServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/finance",
    createFinanceFeature({
      contextFactory,
      ...(options.financeServices ? { services: options.financeServices } : {}),
    }),
  );
  app.route(
    "/api/v1/documents",
    createDocumentsFeature({
      contextFactory,
      ...(options.documentServices
        ? { services: options.documentServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/billing",
    createBillingFeature({
      contextFactory,
      webhookContextFactory: createBillingWebhookContextFactory(options.audit),
      ...(options.billingServices ? { services: options.billingServices } : {}),
    }),
  );
  const agencyAccountContextFactory = createAgencyAccountContextFactory(
    options,
    options.accountProvisioningServices,
  );
  if (options.accountProvisioningServices) {
    app.route(
      "/api/v1/agency",
      createAgencyFeature({
        accountContextFactory: agencyAccountContextFactory,
        ...(options.billingServices
          ? { services: options.billingServices }
          : {}),
      }),
    );
  }
  installCredereFinancingRoutes(app, {
    accountContextFactory: agencyAccountContextFactory,
    contextFactory,
    ...(options.financingServices
      ? { services: options.financingServices }
      : {}),
  });
  installFiscalRoutes(app, options, contextFactory);
  app.route(
    "/api/v1/analytics",
    createAnalyticsFeature({
      contextFactory,
      ...(options.analyticsServices
        ? { services: options.analyticsServices }
        : {}),
    }),
  );
  installAutomationRoutes(app, options, contextFactory);
  app.route(
    "/api/v1/compliance",
    createComplianceFeature({
      contextFactory,
      ...(options.complianceServices
        ? { services: options.complianceServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/external-api",
    createExternalApiFeature({
      contextFactory,
      runtimeServices: {
        crm: options.crmServices,
        inventory: options.inventoryListingServices,
      },
      ...(options.externalApiServices
        ? { services: options.externalApiServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/internal",
    createInternalMonitoringFeature({
      accountContextFactory,
      contextFactory,
      ...(options.internalMonitoringServices
        ? { services: options.internalMonitoringServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/marketplaces",
    createMarketplaceFeature({
      contextFactory,
      ...(options.marketplaceServices
        ? { services: options.marketplaceServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/crm",
    createCrmFeature({
      accountContextFactory,
      contextFactory,
      financialProductTransactionRunner:
        options.crmFinancialProductTransactionRunner,
      financeServices: options.financeServices,
      realtimeBroker: options.crmRealtimeBroker,
      resolveBotEntitlements: options.resolveCrmBotEntitlements,
      webhookContextFactory: createCrmWebhookContextFactory(options.audit),
      ...(options.crmServices ? { services: options.crmServices } : {}),
    }),
  );
  app.route(
    "/api/v1/sales",
    createSalesFeature({
      contextFactory,
      ...(options.salesServices ? { services: options.salesServices } : {}),
    }),
  );
  app.route(
    "/api/v1/settings",
    createSettingsFeature({
      contextFactory,
      ...(options.settingsServices
        ? { services: options.settingsServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/identity",
    createRolesFeature({
      contextFactory,
      ...(options.roleServices ? { services: options.roleServices } : {}),
    }),
  );
  return app;
}
