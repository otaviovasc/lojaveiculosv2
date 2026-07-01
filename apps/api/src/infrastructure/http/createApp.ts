import { Hono, type Context } from "hono";
import type { AuditSink } from "@lojaveiculosv2/audit";
import type { BillingServices } from "../../features/billing/controllers/billingServices.js";
import { createAnalyticsFeature } from "../../features/analytics/controllers/analytics.controller.js";
import type { AnalyticsServices } from "../../features/analytics/controllers/analyticsServices.js";
import { createComplianceFeature } from "../../features/compliance/controllers/compliance.controller.js";
import type { ComplianceServices } from "../../features/compliance/controllers/complianceServices.js";
import { createDocumentsFeature } from "../../features/documents/controllers/documents.controller.js";
import type { DocumentServices } from "../../features/documents/controllers/documentServices.js";
import { createExternalApiFeature } from "../../features/externalApi/controllers/externalApi.controller.js";
import type { ExternalApiServices } from "../../features/externalApi/controllers/externalApiServices.js";
import type { FinanceServices } from "../../features/finance/controllers/financeServices.js";
import { createInternalMonitoringFeature } from "../../features/internal/controllers/internalMonitoring.controller.js";
import type { InternalMonitoringServices } from "../../features/internal/controllers/internalMonitoringServices.js";
import { createMarketplaceFeature } from "../../features/marketplaces/controllers/marketplace.controller.js";
import type { MarketplaceServices } from "../../features/marketplaces/controllers/marketplaceServices.js";
import type { InventoryListingServices } from "../../features/inventory/controllers/listingServices.js";
import type { InventoryEnrichmentServices } from "../../features/inventory/controllers/inventoryEnrichmentServices.js";
import { docsFeature } from "../../features/docs/controllers/docs.controller.js";
import { createCrmFeature } from "../../features/crm/controllers/crm.controller.js";
import type { CrmServices } from "../../features/crm/controllers/crmServices.js";
import { createFinanceFeature } from "../../features/finance/controllers/finance.controller.js";
import { createFiscalFeature } from "../../features/fiscal/controllers/fiscal.controller.js";
import type { FiscalServices } from "../../features/fiscal/controllers/fiscalServices.js";
import { createBillingFeature } from "../../features/billing/controllers/billing.controller.js";
import { createInventoryFeature } from "../../features/inventory/controllers/vehicle.controller.js";
import { createStorefrontFeature } from "../../features/storefront/controllers/storefront.controller.js";
import { createStorefrontPageServices } from "../../features/storefront/controllers/storefrontPageServices.js";
import { createStorefrontPagesFeature } from "../../features/storefront/controllers/storefrontPages.controller.js";
import { createSettingsFeature } from "../../features/settings/controllers/settings.controller.js";
import type { SettingsServices } from "../../features/settings/controllers/settingsServices.js";
import { createSalesFeature } from "../../features/sales/controllers/sales.controller.js";
import type { SalesServices } from "../../features/sales/controllers/salesServices.js";
import { createRolesFeature } from "../../features/identity/controllers/roles.controller.js";
import type { RoleServices } from "../../features/identity/controllers/roleServices.js";
import type { AccountProvisioningServices } from "../../features/identity/controllers/accountProvisioningServices.js";
import type { StoreAccessRepository } from "../../domains/identity/ports/storeAccessRepository.js";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import type { PublicStorefrontRepository } from "../../domains/storefront/ports/publicStorefrontRepository.js";
import type { StorefrontPageRepository } from "../../domains/storefront/ports/storefrontPageRepository.js";
import type { CrmRepository } from "../../domains/crm/ports/crmRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";
import type { ClerkUserProfileProvider } from "../auth/clerkAccountProvisioning.js";
import { createExternalApiRequestLogger } from "./externalApiRequestLogger.js";
import type { HttpIdentityVerifier } from "./httpIdentityVerifier.js";
import { installAccountProvisioningRoutes } from "./installAccountProvisioningRoutes.js";
import { installHttpMiddleware } from "./installHttpMiddleware.js";
import { createLocalHttpLogger } from "./localHttpLogger.js";
export type CreateAppOptions = {
  analyticsServices?: AnalyticsServices;
  audit?: AuditSink;
  accountProvisioningServices?: AccountProvisioningServices;
  billingServices?: BillingServices;
  complianceServices?: ComplianceServices;
  crmServices?: CrmServices;
  documentServices?: DocumentServices;
  externalApiRepository?: ExternalApiRepository;
  externalApiServices?: ExternalApiServices;
  financeServices?: FinanceServices;
  fiscalServices?: FiscalServices;
  identityVerifier?: HttpIdentityVerifier;
  clerkUserProfileProvider?: ClerkUserProfileProvider;
  internalMonitoringServices?: InternalMonitoringServices;
  marketplaceServices?: MarketplaceServices;
  inventoryEnrichmentServices?: InventoryEnrichmentServices;
  inventoryListingServices?: InventoryListingServices;
  publicStorefrontRepository?: PublicStorefrontRepository;
  storefrontPageRepository?: StorefrontPageRepository;
  publicStorefrontCrmRepository?: CrmRepository;
  roleServices?: RoleServices;
  salesServices?: SalesServices;
  settingsServices?: SettingsServices;
  storeAccessRepository?: StoreAccessRepository;
};
export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();
  installHttpMiddleware(app);
  app.use("*", createLocalHttpLogger());
  app.use(
    "/api/v1/*",
    createExternalApiRequestLogger(options.externalApiRepository),
  );
  const contextOptions = options.storeAccessRepository
    ? {
        ...(options.audit ? { audit: options.audit } : {}),
        ...(options.identityVerifier
          ? { identityVerifier: options.identityVerifier }
          : {}),
        ...(options.externalApiRepository
          ? { externalApiRepository: options.externalApiRepository }
          : {}),
        repository: options.storeAccessRepository,
      }
    : {};
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
  const contextFactory = (context: Context) =>
    createHttpServiceContext(context, contextOptions);
  app.route("/", docsFeature);
  app.get("/health", (context) => context.json({ ok: true }));
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
      ...(options.billingServices ? { services: options.billingServices } : {}),
    }),
  );
  app.route(
    "/api/v1/fiscal",
    createFiscalFeature({
      contextFactory,
      ...(options.fiscalServices ? { services: options.fiscalServices } : {}),
    }),
  );
  app.route(
    "/api/v1/analytics",
    createAnalyticsFeature({
      contextFactory,
      ...(options.analyticsServices
        ? { services: options.analyticsServices }
        : {}),
    }),
  );
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
      ...(options.externalApiServices
        ? { services: options.externalApiServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/internal",
    createInternalMonitoringFeature({
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
      contextFactory,
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
