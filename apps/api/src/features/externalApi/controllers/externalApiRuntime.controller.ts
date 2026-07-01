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

export type ExternalApiRuntimeServices = {
  crm?: CrmServices | undefined;
  inventory?: InventoryListingServices | undefined;
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
  });
  registerExternalLeadRoutes(feature, {
    contextFactory: input.contextFactory,
    crm: services.crm,
  });
}

function readBaseUrl(context: Context) {
  const url = new URL(context.req.url);
  return url.origin;
}
