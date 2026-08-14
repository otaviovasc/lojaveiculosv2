import { describe, expect, it, vi } from "vitest";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("OLX OAuth, account, and catalog transport safeguards", () => {
  it("denies redirects and adds a timeout to OAuth token exchange", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ access_token: "access_token_1" }));

    await createOlxTestGateway(fetch).exchangeAuthorizationCode({
      code: "authorization_code",
      redirectUri: "https://app.example.test/olx/callback",
    });

    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      redirect: "error",
    });
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("bounds token and basic-user-info response bodies", async () => {
    const oversized = () =>
      jsonResponse({ access_token: "secret" }, 200, {
        "content-length": "70000",
      });
    const tokenFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(oversized());
    const accountFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(oversized());

    await expect(
      createOlxTestGateway(tokenFetch).exchangeAuthorizationCode({
        code: "authorization_code",
        redirectUri: "https://app.example.test/olx/callback",
      }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      details: { provider: "olx" },
    });
    await expect(
      createOlxTestGateway(accountFetch).checkAccount({ token: tokenSet() }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      details: { provider: "olx" },
    });
  });

  it("maps basic-user-info rate limits without exposing provider bodies", async () => {
    const providerSecret = "provider-secret-body";
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        jsonResponse(
          { access_token: providerSecret, message: providerSecret },
          429,
          { "retry-after": "11" },
        ),
      );

    const error = await createOlxTestGateway(fetch)
      .checkAccount({ token: tokenSet() })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "MARKETPLACE_PROVIDER_RATE_LIMITED",
      details: { provider: "olx", retryAfterSeconds: 11 },
    });
    expect(JSON.stringify(error)).not.toContain(providerSecret);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: "error" });
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("bounds catalog responses and safely maps transport failures", async () => {
    const oversizedFetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ data: { BMW: 7 }, status: "ok" }, 200, {
        "content-length": "70000",
      }),
    );
    const rejectedFetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new Error("network response with customer secret"));

    await expect(resolve(oversizedFetch)).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      details: { provider: "olx" },
    });
    expect(oversizedFetch.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      redirect: "error",
    });
    expect(oversizedFetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(
      AbortSignal,
    );
    const error = await resolve(rejectedFetch).catch(
      (caught: unknown) => caught,
    );
    expect(error).toMatchObject({
      code: "MARKETPLACE_PROVIDER_UNAVAILABLE",
      details: { provider: "olx" },
    });
    expect(JSON.stringify(error)).not.toContain("customer secret");
  });
});

function resolve(fetch: typeof globalThis.fetch) {
  const gateway = createOlxTestGateway(fetch);
  if (!gateway.resolveCatalogMapping) throw new Error("Missing OLX resolver");
  return gateway.resolveCatalogMapping({
    catalog: listingProjection().catalog,
    token: tokenSet(),
  });
}
