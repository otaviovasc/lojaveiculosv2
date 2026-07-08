import { describe, expect, it, vi } from "vitest";
import { createHttpMarketplaceProviderGateway } from "./httpMarketplaceProviderGateway.js";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("createHttpMarketplaceProviderGateway OLX", () => {
  it("creates OAuth URLs with scope and checks accounts with token body", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        user_email: "seller@example.test",
        user_name: "Seller",
      }),
    );
    const gateway = olxGateway(fetch);

    const url = new URL(
      await gateway.createAuthorizationUrl({
        redirectUri: "https://app.example.test/olx/callback",
        state: "state_1",
      }),
    );
    const status = await gateway.checkAccount({ token: tokenSet() });

    expect(url.origin).toBe("https://auth.olx.test");
    expect(url.searchParams.get("scope")).toBe(
      "autoupload basic_user_info autoservice chat",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://apps.olx.test/oauth_api/basic_user_info",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({
      access_token: "token_1",
    });
    expect(status).toEqual({
      accountId: "seller@example.test",
      requirements: [],
      status: "connected",
    });
  });

  it("publishes Autoupload payloads using mapped provider catalog ids", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        statusCode: 0,
        statusMessage: "Import accepted",
        token: "secret_import_token",
      }),
    );
    const result = await olxGateway(fetch).runListingSync({
      jobType: "listing_publish",
      listing: listingProjection(),
      metadata: {
        providerMapping: {
          providerBrandCode: "17",
          providerModelCode: "5",
          providerTrimCode: "3",
        },
      },
      token: tokenSet(),
    });

    const request = fetch.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as {
      access_token: string;
      ad_list: {
        category: number;
        id: string;
        operation: string;
        params: Record<string, unknown>;
      }[];
    };

    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://apps.olx.test/autoupload/import",
    );
    expect(request?.method).toBe("PUT");
    expect(request?.headers).not.toHaveProperty("Authorization");
    expect(body.access_token).toBe("token_1");
    expect(body.ad_list[0]).toMatchObject({
      category: 2020,
      id: "listing_1",
      operation: "insert",
      phone: 11999999999,
      params: {
        doors: "2",
        fuel: "1",
        mileage: 12000,
        regdate: "2024",
        vehicle_brand: "17",
        vehicle_model: "5",
        vehicle_tag: "ABC1D23",
        vehicle_version: "3",
      },
      zipcode: "01310100",
    });
    expect(result).toMatchObject({
      externalId: "listing_1",
      metadata: {
        providerRequest: {
          categoryId: "2020",
          parameterIds: [
            "regdate",
            "mileage",
            "fuel",
            "doors",
            "vehicle_brand",
            "vehicle_model",
            "vehicle_version",
            "vehicle_tag",
          ],
        },
        providerResult: {
          externalId: "listing_1",
          providerRequestId: "provider_req_1",
          providerStatus: "Import accepted",
        },
      },
    });
    expect(JSON.stringify(result)).not.toContain("secret_import_token");
    expect(JSON.stringify(result)).not.toContain("token_1");
  });

  it("unpublishes listings with the Autoupload delete operation", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ statusCode: 0 }));

    const result = await olxGateway(fetch).runListingSync({
      externalId: "listing_1",
      jobType: "listing_unpublish",
      metadata: {},
      token: tokenSet(),
    });

    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as {
      ad_list: { id: string; operation: string }[];
    };
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(body.ad_list).toEqual([{ id: "listing_1", operation: "delete" }]);
    expect(result.externalId).toBe("listing_1");
  });

  it.each([
    [-4, "MARKETPLACE_PROVIDER_VALIDATION_FAILED"],
    [-6, "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"],
    [-7, "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"],
    [-8, "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"],
    [-99, "MARKETPLACE_PROVIDER_UNAVAILABLE"],
  ] as const)("maps statusCode %s to %s", async (statusCode, code) => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ statusCode }));

    await expect(
      olxGateway(fetch).runListingSync({
        jobType: "listing_publish",
        listing: listingProjection(),
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code,
      details: { provider: "olx", providerStatus: String(statusCode) },
    });
  });

  it("maps per-ad delete not-found errors to listing not found", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        errors: [
          {
            id: "listing_1",
            messages: [{ id: "not found" }],
            status: "error",
          },
        ],
        statusCode: -4,
      }),
    );

    await expect(
      olxGateway(fetch).runListingSync({
        externalId: "listing_1",
        jobType: "listing_unpublish",
        metadata: {},
        token: tokenSet(),
      }),
    ).rejects.toMatchObject({
      code: "MARKETPLACE_LISTING_NOT_FOUND",
      details: { externalId: "listing_1", provider: "olx" },
    });
  });
});

function olxGateway(fetch: typeof globalThis.fetch) {
  return createHttpMarketplaceProviderGateway({
    auth: { clientId: "olx_client", clientSecret: "olx_secret" },
    authorizationScope: "autoupload basic_user_info autoservice chat",
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
