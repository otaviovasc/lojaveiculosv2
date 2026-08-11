import { describe, expect, it } from "vitest";
import { createMarketplaceOAuthRedirectUriResolver } from "./marketplaceOAuthRedirectUris.js";

describe("marketplace OAuth redirect URI resolver", () => {
  it("derives the exact OLX callback from each server-owned public origin", () => {
    expect(
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "local",
        PUBLIC_APP_URL: "http://localhost:5173",
      })("olx"),
    ).toBe("http://localhost:5173/api/v1/marketplaces/oauth/olx/callback");
    expect(
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "staging",
        PUBLIC_APP_URL: "https://staging.lojaveiculos.com.br",
      })("olx"),
    ).toBe(
      "https://staging.lojaveiculos.com.br/api/v1/marketplaces/oauth/olx/callback",
    );
    expect(
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "production",
        PUBLIC_APP_URL: "https://v2.lojaveiculos.com.br",
      })("olx"),
    ).toBe(
      "https://v2.lojaveiculos.com.br/api/v1/marketplaces/oauth/olx/callback",
    );
  });

  it("allows HTTP only for loopback local and test origins", () => {
    expect(
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "test",
        PUBLIC_APP_URL: "http://127.0.0.1:5173",
      })("olx"),
    ).toBe("http://127.0.0.1:5173/api/v1/marketplaces/oauth/olx/callback");
    expect(() =>
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "staging",
        PUBLIC_APP_URL: "http://staging.lojaveiculos.com.br",
      })("olx"),
    ).toThrow(
      "PUBLIC_APP_URL may use HTTP only for a loopback local or test origin.",
    );
    expect(() =>
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "staging",
        NODE_ENV: "test",
        PUBLIC_APP_URL: "http://localhost:5173",
      })("olx"),
    ).toThrow(
      "PUBLIC_APP_URL may use HTTP only for a loopback local or test origin.",
    );
    expect(() =>
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "local",
        PUBLIC_APP_URL: "http://example.test",
      })("olx"),
    ).toThrow(
      "PUBLIC_APP_URL may use HTTP only for a loopback local or test origin.",
    );
  });

  it("requires a public HTTPS origin in deployed runtimes", () => {
    expect(() =>
      createMarketplaceOAuthRedirectUriResolver({
        APP_ENV: "production",
        PUBLIC_APP_URL: "https://localhost:5173",
      })("olx"),
    ).toThrow("PUBLIC_APP_URL must be a public HTTPS origin.");
  });

  it("keeps Mercado Livre redirect input server-owned", () => {
    const resolve = createMarketplaceOAuthRedirectUriResolver({
      PUBLIC_APP_URL: "https://app.example.test/untrusted/path?ignored=true",
    });
    expect(resolve("mercado_livre")).toBe(
      "https://app.example.test/marketplaces/oauth/callback",
    );
  });
});
