import { describe, expect, it } from "vitest";
import {
  marketplaceRedirectUri,
  readMarketplaceOauthCallback,
} from "./marketplaceOauthCallback";

describe("marketplace OAuth callback", () => {
  it("reads the provider and authorization code from a valid callback", () => {
    const state = encodeURIComponent(
      JSON.stringify({ provider: "mercado_livre", storeId: "store_1" }),
    );

    expect(
      readMarketplaceOauthCallback({
        pathname: "/marketplaces/oauth/callback",
        search: `?code=authorization_code&state=${state}`,
      }),
    ).toEqual({
      code: "authorization_code",
      kind: "success",
      provider: "mercado_livre",
    });
  });

  it("fails visibly when the provider cancels authorization", () => {
    expect(
      readMarketplaceOauthCallback({
        pathname: "/marketplaces/oauth/callback",
        search: `?error=access_denied&state=${encodeURIComponent(
          JSON.stringify({ provider: "olx" }),
        )}`,
      }),
    ).toEqual({
      kind: "error",
      message:
        "A autorização foi cancelada ou recusada pelo canal. Nenhuma conta foi conectada.",
      provider: "olx",
    });
  });

  it("ignores regular marketplace routes", () => {
    expect(
      readMarketplaceOauthCallback({
        pathname: "/dashboard",
        search: "?code=ignored",
      }),
    ).toEqual({ kind: "none" });
    expect(marketplaceRedirectUri({ origin: "https://app.example.com" })).toBe(
      "https://app.example.com/marketplaces/oauth/callback",
    );
  });
});
