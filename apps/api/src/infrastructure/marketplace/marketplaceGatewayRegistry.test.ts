import { describe, expect, it } from "vitest";
import { createMarketplaceGatewayRegistry } from "./marketplaceGatewayRegistry.js";
import { MarketplaceProviderGatewayError } from "./httpMarketplaceProviderGatewaySupport.js";
import {
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("createMarketplaceGatewayRegistry", () => {
  it("fails Mercado Livre closed when env config is missing", async () => {
    const gateway = createMarketplaceGatewayRegistry({}).getGateway(
      "mercado_livre",
    );

    await expect(
      gateway.createAuthorizationUrl({ redirectUri: "x", state: "s" }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
      provider: "mercado_livre",
      status: 503,
    });
  });

  it("fails OLX closed when env config is missing", async () => {
    const gateway = createMarketplaceGatewayRegistry({}).getGateway("olx");

    await expect(
      gateway.createAuthorizationUrl({ redirectUri: "x", state: "s" }),
    ).rejects.toBeInstanceOf(MarketplaceProviderGatewayError);
    await expect(
      gateway.createAuthorizationUrl({ redirectUri: "x", state: "s" }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("fails OLX closed when client secret is missing", async () => {
    const gateway = createMarketplaceGatewayRegistry({
      OLX_CLIENT_ID: "olx_client",
    }).getGateway("olx");

    await expect(
      gateway.runListingSync({
        jobType: "listing_publish",
        listing: listingProjection(),
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
    });
  });

  it("uses OLX Autoupload defaults when credentials exist", async () => {
    const gateway = createMarketplaceGatewayRegistry({
      OLX_CLIENT_ID: "olx_client",
      OLX_CLIENT_SECRET: "olx_secret",
    }).getGateway("olx");

    const url = new URL(
      await gateway.createAuthorizationUrl({
        redirectUri: "https://app.example.test/olx/callback",
        state: "state_1",
      }),
    );

    expect(url.origin).toBe("https://auth.olx.com.br");
    expect(url.pathname).toBe("/oauth");
    expect(url.searchParams.get("scope")).toBe(
      "basic_user_info autoupload autoservice chat",
    );
  });
});
