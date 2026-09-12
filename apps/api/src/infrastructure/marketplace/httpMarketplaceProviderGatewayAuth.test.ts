import { describe, expect, it, vi } from "vitest";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";
import { jsonResponse } from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("marketplace token exchange contract", () => {
  it.each([{}, { access_token: "   " }])(
    "rejects a missing access token",
    async (payload) => {
      const gateway = createGateway(
        vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(payload)),
      );
      await expect(
        gateway.exchangeAuthorizationCode({
          code: "code_1",
          redirectUri: "https://app.test/callback",
        }),
      ).rejects.toMatchObject({
        code: "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
        status: 502,
      });
    },
  );

  it("normalizes provider scopes", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        access_token: "access",
        scope: " Chat,autoupload chat  BASIC_USER_INFO ",
      }),
    );
    const token = await createGateway(fetch).exchangeAuthorizationCode({
      code: "code_1",
      redirectUri: "https://app.test/callback",
    });
    expect(token.scope).toBe("autoupload basic_user_info chat");
  });
});

function createGateway(fetch: typeof globalThis.fetch) {
  return createHttpMarketplaceProviderGateway({
    auth: { clientId: "client" },
    baseUrl: "https://api.test",
    fetch,
    provider: "mercado_livre",
    tokenUrl: "https://api.test/token",
  });
}
