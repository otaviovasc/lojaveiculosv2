import { describe, expect, it } from "vitest";
import { createMarketplaceGatewayRegistry } from "./marketplaceGatewayRegistry.js";
import { MarketplaceProviderGatewayError } from "./httpMarketplaceProviderGatewaySupport.js";
import {
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("createMarketplaceGatewayRegistry", () => {
  it("fails OLX closed when env config is missing", async () => {
    const gateway = createMarketplaceGatewayRegistry({}).getGateway("olx");

    await expect(
      gateway.createAuthorizationUrl({ redirectUri: "x", state: "s" }),
    ).rejects.toBeInstanceOf(MarketplaceProviderGatewayError);
    await expect(
      gateway.createAuthorizationUrl({ redirectUri: "x", state: "s" }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
    });
  });

  it("fails OLX closed when requirement contract config is missing", async () => {
    const gateway = createMarketplaceGatewayRegistry({
      OLX_API_BASE_URL: "https://olx.example.test",
      OLX_AUTHORIZATION_URL: "https://olx.example.test/oauth",
      OLX_CLIENT_ID: "olx_client",
      OLX_LISTINGS_PATH: "/partner/listings",
      OLX_TOKEN_URL: "https://olx.example.test/token",
    }).getGateway("olx");

    await expect(
      gateway.runListingSync({
        jobType: "listing_publish",
        listing: listingProjection(),
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_CONTRACT_MISSING",
    });
  });
});
