import type { Hono } from "hono";
import {
  createAgencyCredereFinancingFeature,
  createCredereFinancingFeature,
} from "./credereFinancing.controller.js";
import type {
  AgencyAccountContextFactory,
  FinancingContextFactory,
} from "./credereFinancing.controller.context.js";
import type { CredereFinancingServices } from "./credereFinancingServices.js";

export function installCredereFinancingRoutes(
  app: Hono,
  input: {
    accountContextFactory: AgencyAccountContextFactory;
    contextFactory: FinancingContextFactory;
    services?: CredereFinancingServices;
  },
) {
  app.route(
    "/api/v1/agency",
    createAgencyCredereFinancingFeature({
      accountContextFactory: input.accountContextFactory,
      ...(input.services ? { services: input.services } : {}),
    }),
  );
  app.route(
    "/api/v1/financing",
    createCredereFinancingFeature({
      contextFactory: input.contextFactory,
      ...(input.services ? { services: input.services } : {}),
    }),
  );
}
