import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";

export function createOlxTestGateway(fetch: typeof globalThis.fetch) {
  return createHttpMarketplaceProviderGateway({
    auth: { clientId: "olx_client", clientSecret: "olx_secret" },
    authorizationScope: "basic_user_info autoupload autoservice chat",
    authorizationUrl: "https://auth.olx.test/oauth",
    baseUrl: "https://apps.olx.test",
    fetch,
    listingPath: "/autoupload/import",
    provider: "olx",
    requirementConfig: {
      accountCheckPath: "/oauth_api/basic_user_info",
      requirements: [],
    },
    tokenUrl: "https://auth.olx.test/oauth/token",
  });
}
