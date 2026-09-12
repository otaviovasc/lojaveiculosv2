import { describe, expect, it } from "vitest";
import { readMarketplaceOauthCallback } from "./marketplaceOauthCallback";

describe("marketplace OAuth callback", () => {
  it("keeps opaque inline callback state for authenticated completion", () => {
    expect(
      readMarketplaceOauthCallback({
        pathname: "/marketplaces/oauth/callback",
        search: "?code=authorization_code&state=opaque_state_value",
      }),
    ).toEqual({
      code: "authorization_code",
      kind: "inline",
      state: "opaque_state_value",
    });
  });

  it("reads the non-secret staged server callback result", () => {
    expect(
      readMarketplaceOauthCallback({
        pathname: "/dashboard",
        search:
          "?marketplaceOauth=pending&provider=olx&transactionId=transaction_1",
      }),
    ).toEqual({
      kind: "staged",
      provider: "olx",
      transactionId: "transaction_1",
    });
  });

  it("keeps only the sanitized callback support reference and stable code", () => {
    expect(
      readMarketplaceOauthCallback({
        pathname: "/dashboard",
        search:
          "?marketplaceOauth=error&provider=olx&errorCode=MARKETPLACE_OAUTH_CALLBACK_FAILED&requestId=req_123",
      }),
    ).toEqual({
      errorCode: "MARKETPLACE_OAUTH_CALLBACK_FAILED",
      kind: "result-error",
      provider: "olx",
      requestId: "req_123",
    });
  });

  it("ignores regular marketplace routes", () => {
    expect(
      readMarketplaceOauthCallback({
        pathname: "/dashboard",
        search: "?code=ignored",
      }),
    ).toEqual({ kind: "none" });
  });
});
