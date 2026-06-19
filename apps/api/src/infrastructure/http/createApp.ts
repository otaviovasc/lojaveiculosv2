import { Hono } from "hono";
import type { AuditSink } from "@lojaveiculosv2/audit";
import type { BillingServices } from "../../features/billing/controllers/billingServices.js";
import { createExternalApiFeature } from "../../features/externalApi/controllers/externalApi.controller.js";
import type { ExternalApiServices } from "../../features/externalApi/controllers/externalApiServices.js";
import type { FinanceServices } from "../../features/finance/controllers/financeServices.js";
import { createInternalMonitoringFeature } from "../../features/internal/controllers/internalMonitoring.controller.js";
import type { InternalMonitoringServices } from "../../features/internal/controllers/internalMonitoringServices.js";
import type { InventoryListingServices } from "../../features/inventory/controllers/listingServices.js";
import { docsFeature } from "../../features/docs/controllers/docs.controller.js";
import { createCrmFeature } from "../../features/crm/controllers/crm.controller.js";
import type { CrmServices } from "../../features/crm/controllers/crmServices.js";
import { createFinanceFeature } from "../../features/finance/controllers/finance.controller.js";
import { createBillingFeature } from "../../features/billing/controllers/billing.controller.js";
import { createInventoryFeature } from "../../features/inventory/controllers/vehicle.controller.js";
import { createStorefrontFeature } from "../../features/storefront/controllers/storefront.controller.js";
import { createSettingsFeature } from "../../features/settings/controllers/settings.controller.js";
import type { SettingsServices } from "../../features/settings/controllers/settingsServices.js";
import { createRolesFeature } from "../../features/identity/controllers/roles.controller.js";
import type { RoleServices } from "../../features/identity/controllers/roleServices.js";
import type { StoreAccessRepository } from "../../domains/identity/ports/storeAccessRepository.js";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import type { PublicStorefrontRepository } from "../../domains/storefront/ports/publicStorefrontRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";
import { createExternalApiRequestLogger } from "./externalApiRequestLogger.js";
import type { HttpIdentityVerifier } from "./httpIdentityVerifier.js";
import { createLocalHttpLogger } from "./localHttpLogger.js";

export type CreateAppOptions = {
  audit?: AuditSink;
  billingServices?: BillingServices;
  crmServices?: CrmServices;
  externalApiRepository?: ExternalApiRepository;
  externalApiServices?: ExternalApiServices;
  financeServices?: FinanceServices;
  identityVerifier?: HttpIdentityVerifier;
  internalMonitoringServices?: InternalMonitoringServices;
  inventoryListingServices?: InventoryListingServices;
  publicStorefrontRepository?: PublicStorefrontRepository;
  roleServices?: RoleServices;
  settingsServices?: SettingsServices;
  storeAccessRepository?: StoreAccessRepository;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono();
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
        repository: options.publicStorefrontRepository,
      }
    : {};

  app.route("/", docsFeature);
  app.get("/health", (context) => context.json({ ok: true }));
  app.route(
    "/api/v1/public/storefront",
    createStorefrontFeature(storefrontOptions),
  );
  app.route(
    "/api/v1/inventory",
    createInventoryFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.inventoryListingServices
        ? { services: options.inventoryListingServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/finance",
    createFinanceFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.financeServices ? { services: options.financeServices } : {}),
    }),
  );
  app.route(
    "/api/v1/billing",
    createBillingFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.billingServices ? { services: options.billingServices } : {}),
    }),
  );
  app.route(
    "/api/v1/external-api",
    createExternalApiFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.externalApiServices
        ? { services: options.externalApiServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/internal",
    createInternalMonitoringFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.internalMonitoringServices
        ? { services: options.internalMonitoringServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/crm",
    createCrmFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.crmServices ? { services: options.crmServices } : {}),
    }),
  );
  app.route(
    "/api/v1/settings",
    createSettingsFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.settingsServices
        ? { services: options.settingsServices }
        : {}),
    }),
  );
  app.route(
    "/api/v1/identity",
    createRolesFeature({
      contextFactory: (context) =>
        createHttpServiceContext(context, contextOptions),
      ...(options.roleServices ? { services: options.roleServices } : {}),
    }),
  );

  return app;
}
