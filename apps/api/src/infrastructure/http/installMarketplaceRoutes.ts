import type { Hono } from "hono";
import { createMarketplaceOAuthCallbackFeature } from "../../features/marketplaces/controllers/marketplace.oauth.controller.js";
import {
  createMarketplaceFeature,
  type MarketplaceContextFactory,
} from "../../features/marketplaces/controllers/marketplace.controller.js";
import type { CreateAppOptions } from "./createAppOptions.js";
import { createHttpIntegrationServiceContext } from "./httpIntegrationServiceContext.js";

export function installMarketplaceRoutes(
  app: Hono,
  options: CreateAppOptions,
  contextFactory: MarketplaceContextFactory,
) {
  const services = options.marketplaceServices;
  app.route(
    "/api/v1/marketplaces",
    createMarketplaceFeature({
      contextFactory,
      ...(services ? { services } : {}),
    }),
  );
  app.route(
    "/api/v1/marketplaces/oauth/olx",
    createMarketplaceOAuthCallbackFeature({
      callbackContextFactory: async (context) =>
        createHttpIntegrationServiceContext(
          context,
          {
            actorId: "olx-oauth-callback",
            displayName: "OLX OAuth callback",
            permissions: ["marketplace.manage"],
          },
          {
            ...(options.audit ? { audit: options.audit } : {}),
            ...(options.logger ? { logger: options.logger } : {}),
          },
        ),
      ...(services ? { services } : {}),
    }),
  );
}
