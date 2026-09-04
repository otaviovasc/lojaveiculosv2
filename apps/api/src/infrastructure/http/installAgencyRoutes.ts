import type { Hono } from "hono";
import { createAgencyFeature } from "../../features/agency/controllers/agency.controller.js";
import { createAgencyStatsFeature } from "../../features/agency/controllers/agencyStats.controller.js";
import { createAgencyTeamAccessFeature } from "../../features/agency/controllers/agencyTeamAccess.controller.js";
import type { CreateAppOptions } from "./createAppOptions.js";
import { createAgencyAccountContextFactory } from "./createAgencyAccountContextFactory.js";

export function installAgencyRoutes(app: Hono, options: CreateAppOptions) {
  const accountContextFactory = createAgencyAccountContextFactory(
    options,
    options.accountProvisioningServices,
  );
  if (!options.accountProvisioningServices) return accountContextFactory;

  app.route(
    "/api/v1/agency",
    createAgencyFeature({
      accountContextFactory,
      ...(options.billingServices ? { services: options.billingServices } : {}),
    }),
  );
  if (options.agencyStatsServices) {
    app.route(
      "/api/v1/agency",
      createAgencyStatsFeature({
        accountContextFactory,
        services: options.agencyStatsServices,
      }),
    );
  }
  if (options.agencyTeamAccessServices) {
    app.route(
      "/api/v1/agency",
      createAgencyTeamAccessFeature({
        accountContextFactory,
        services: options.agencyTeamAccessServices,
      }),
    );
  }
  return accountContextFactory;
}
