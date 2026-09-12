import type { Context, Hono } from "hono";
import type { CrmServices } from "../../crm/controllers/crmServices.js";
import { crmServices as defaultCrmServices } from "../../crm/controllers/crmServices.js";
import type { InventoryListingServices } from "../../inventory/controllers/listingServices.js";
import { inventoryListingServices } from "../../inventory/controllers/listingServices.js";
import {
  createExternalApiManifest,
  createExternalApiTools,
} from "./externalApiRuntime.manifest.js";
import type { RuntimeContextFactory } from "./externalApiRuntime.http.js";
import { registerExternalLeadRoutes } from "./externalApiRuntime.leads.js";
import { registerExternalVehicleRoutes } from "./externalApiRuntime.vehicles.js";
import type { CredereFinancingServices } from "../../financing/controllers/credereFinancingServices.js";
import { credereFinancingServices } from "../../financing/controllers/credereFinancingServices.js";
import { registerExternalCredereRoutes } from "./externalApiRuntime.credere.js";
import type { PublicStorefrontRepository } from "../../../domains/storefront/ports/publicStorefrontRepository.js";

export type ExternalApiRuntimeServices = {
  crm?: CrmServices | undefined;
  financing?: CredereFinancingServices | undefined;
  inventory?: InventoryListingServices | undefined;
  publicStorefront?: PublicStorefrontRepository | undefined;
};

export function registerExternalApiRuntimeRoutes(
  feature: Hono,
  input: {
    contextFactory: RuntimeContextFactory;
    services?: ExternalApiRuntimeServices;
  },
) {
  const services = {
    crm: input.services?.crm ?? defaultCrmServices,
    financing: input.services?.financing ?? credereFinancingServices,
    inventory: input.services?.inventory ?? inventoryListingServices,
  };

  feature.get("/manifest", (context) =>
    context.json(createExternalApiManifest(readBaseUrl(context))),
  );
  feature.get("/ai-tools", (context) =>
    context.json(createExternalApiTools(readBaseUrl(context))),
  );
  registerExternalVehicleRoutes(feature, {
    contextFactory: input.contextFactory,
    inventory: services.inventory,
    ...(input.services?.publicStorefront
      ? { publicStorefront: input.services.publicStorefront }
      : {}),
  });
  registerExternalLeadRoutes(feature, {
    contextFactory: input.contextFactory,
    crm: services.crm,
  });
  registerExternalCredereRoutes(feature, {
    contextFactory: input.contextFactory,
    financing: services.financing,
  });
}

function readBaseUrl(context: Context) {
  const url = new URL(context.req.url);
  return url.origin;
}
