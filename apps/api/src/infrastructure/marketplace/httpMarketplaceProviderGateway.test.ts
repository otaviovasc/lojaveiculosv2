import { describe, expect, it, vi } from "vitest";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("createHttpMarketplaceProviderGateway", () => {
  it("creates OAuth URLs and publishes Mercado Livre payloads", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ id: "MLB123", status: "active" }));
    const gateway = mercadoLivreGateway(fetch);

    const url = await gateway.createAuthorizationUrl({
      redirectUri: "https://app.example.test/callback",
      state: "state_1",
    });
    const result = await gateway.runListingSync({
      jobType: "listing_publish",
      listing: listingProjection(),
      metadata: {},
      token: tokenSet(),
    });

    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as {
      attributes: { id: string; value_name: string }[];
      category_id: string;
    };
    expect(url).toContain("client_id=client_1");
    expect(fetch.mock.calls[0]?.[0]).toBe("https://api.example.test/items");
    expect(body.category_id).toBe("MLB1744");
    expect(body.attributes.map((item) => item.id)).toEqual([
      "BRAND",
      "MODEL",
      "TRIM",
      "VEHICLE_YEAR",
      "VEHICLE_TYPE",
      "FUEL_TYPE",
      "DOORS",
      "KILOMETERS",
    ]);
    expect(result).toEqual({
      externalId: "MLB123",
      metadata: {
        providerRequest: {
          attributeIds: [
            "BRAND",
            "MODEL",
            "TRIM",
            "VEHICLE_YEAR",
            "VEHICLE_TYPE",
            "FUEL_TYPE",
            "DOORS",
            "KILOMETERS",
          ],
          categoryId: "MLB1744",
          currencyId: "BRL",
        },
        providerResult: {
          externalId: "MLB123",
          providerRequestId: "provider_req_1",
          providerStatus: "active",
        },
      },
      providerStatus: "active",
    });
  });

  it("refreshes tokens without exposing secrets", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        access_token: "new_access",
        expires_in: 3600,
        refresh_token: "new_refresh",
        scope: "write",
        token_type: "Bearer",
        user_id: 123,
      }),
    );
    const gateway = mercadoLivreGateway(fetch);

    const token = await gateway.refreshToken?.("old_refresh");

    const body = fetch.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("old_refresh");
    expect(token?.accessToken).toBe("new_access");
    expect(token?.refreshToken).toBe("new_refresh");
    expect(token?.providerAccountId).toBe("123");
  });

  it("checks Mercado Livre account status", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ id: "seller_1" }));

    const status = await mercadoLivreGateway(fetch).checkAccount({
      token: tokenSet(),
    });

    expect(fetch.mock.calls[0]?.[0]).toBe("https://api.example.test/users/me");
    expect(status).toEqual({
      accountId: "seller_1",
      requirements: [],
      status: "connected",
    });
  });

  it("unpublishes listings by provider external id without a payload", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const result = await mercadoLivreGateway(fetch).runListingSync({
      externalId: "MLB123",
      jobType: "listing_unpublish",
      metadata: {},
      token: tokenSet(),
    });

    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://api.example.test/items/MLB123",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(fetch.mock.calls[0]?.[1]).not.toHaveProperty("body");
    expect(result.externalId).toBe("MLB123");
  });

  it("reconciles duplicate publish conflicts with an external-id update", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(jsonResponse({ existing_id: "MLB123" }, 409))
      .mockResolvedValueOnce(jsonResponse({ id: "MLB123", status: "active" }));

    const result = await mercadoLivreGateway(fetch).runListingSync({
      jobType: "listing_publish",
      listing: listingProjection(),
      metadata: {},
      token: tokenSet(),
    });

    expect(fetch.mock.calls[1]?.[0]).toBe(
      "https://api.example.test/items/MLB123",
    );
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("PUT");
    expect(result.externalId).toBe("MLB123");
  });

  it.each([
    [400, "MARKETPLACE_PROVIDER_VALIDATION_FAILED"],
    [401, "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED"],
    [403, "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"],
    [404, "MARKETPLACE_LISTING_NOT_FOUND"],
    [409, "MARKETPLACE_PROVIDER_CONFLICT"],
    [503, "MARKETPLACE_PROVIDER_UNAVAILABLE"],
  ] as const)("maps provider status %s to %s", async (status, code) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        jsonResponse({ message: "provider failure", token: "secret" }, status),
      );

    await expect(
      mercadoLivreGateway(fetch).runListingSync({
        externalId: "MLB123",
        jobType: "listing_update",
        listing: listingProjection(),
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code,
      details: {
        provider: "mercado_livre",
      },
    });
  });

  it("maps 429 retry-after without raw provider payloads", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({ message: "too many", token: "secret" }, 429, {
        "retry-after": "42",
      }),
    );

    await expect(
      mercadoLivreGateway(fetch).runListingSync({
        externalId: "MLB123",
        jobType: "listing_update",
        listing: listingProjection(),
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_PROVIDER_RATE_LIMITED",
      details: {
        provider: "mercado_livre",
        retryAfterSeconds: 42,
      },
      retryAfterSeconds: 42,
    });
  });

  it("maps refresh failures to token refresh errors", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ error: "invalid_grant" }, 400));

    await expect(
      mercadoLivreGateway(fetch).refreshToken?.("bad"),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_TOKEN_REFRESH_FAILED",
    });
  });
});

function mercadoLivreGateway(fetch: typeof globalThis.fetch) {
  return createHttpMarketplaceProviderGateway({
    accountPath: "/users/me",
    auth: { clientId: "client_1", clientSecret: "client_secret" },
    authorizationUrl: "https://auth.example.test/authorization",
    baseUrl: "https://api.example.test",
    fetch,
    provider: "mercado_livre",
    tokenUrl: "https://api.example.test/oauth/token",
  });
}
