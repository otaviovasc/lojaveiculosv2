import { describe, expect, it, vi } from "vitest";
import { createOlxTestGateway } from "./httpMarketplaceProviderGatewayOlxTestSupport.js";
import {
  jsonResponse,
  listingProjection,
  tokenSet,
} from "./httpMarketplaceProviderGatewayTestSupport.js";

describe("createHttpMarketplaceProviderGateway OLX", () => {
  it("keeps the requested scopes when OLX omits an unchanged token scope", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        jsonResponse({ access_token: "token_1", token_type: "Bearer" }),
      );

    const token = await createOlxTestGateway(fetch).exchangeAuthorizationCode({
      code: "authorization_code",
      redirectUri: "https://app.example.test/olx/callback",
    });

    expect(token.scope).toBe("autoservice autoupload basic_user_info chat");
  });

  it("creates OAuth URLs with scope and checks accounts with token body", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        user_email: "seller@example.test",
        user_name: "Seller",
      }),
    );
    const gateway = createOlxTestGateway(fetch);

    const url = new URL(
      await gateway.createAuthorizationUrl({
        redirectUri: "https://app.example.test/olx/callback",
        state: "state_1",
      }),
    );
    const status = await gateway.checkAccount({ token: tokenSet() });

    expect(url.origin).toBe("https://auth.olx.test");
    expect(url.searchParams.get("scope")).toBe(
      "basic_user_info autoupload autoservice chat",
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
    const result = await createOlxTestGateway(fetch).runListingSync({
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
      ad_list: Record<string, unknown>[];
    };

    expect(fetch.mock.calls[0]?.[0]).toBe(
      "https://apps.olx.test/autoupload/import",
    );
    expect(request?.method).toBe("PUT");
    expect(request?.headers).not.toHaveProperty("Authorization");
    expect(body.access_token).toBe("token_1");
    expect(body).toEqual({
      access_token: "token_1",
      ad_list: [
        {
          Body: "Descricao",
          Phone: 11999999999,
          Subject: "BMW M3",
          category: 2020,
          id: "lv_59d376efc6a61cd7",
          images: ["https://cdn.example.test/photo.jpg"],
          operation: "insert",
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
          price: 120000,
          type: "s",
          zipcode: "01310100",
        },
      ],
    });
    expect(result).toMatchObject({
      externalId: "lv_59d376efc6a61cd7",
      operationToken: "secret_import_token",
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
          externalId: "lv_59d376efc6a61cd7",
          providerRequestId: "provider_req_1",
          providerStatus: "submitted",
        },
      },
    });
    expect(JSON.stringify(result.metadata)).not.toContain(
      "secret_import_token",
    );
    expect(JSON.stringify(result)).not.toContain("token_1");
    expect(JSON.stringify(result)).not.toContain("Descricao");
    expect(JSON.stringify(result)).not.toContain("11999999999");
    expect(JSON.stringify(result)).not.toContain("Import accepted");
  });

  it("reuses the mapped provider id for updates", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        statusCode: 0,
        statusMessage: "Import accepted",
        token: "update_import_token",
      }),
    );
    const result = await createOlxTestGateway(fetch).runListingSync({
      externalId: "olx_existing_123",
      jobType: "listing_update",
      listing: listingProjection(),
      metadata: {},
      token: tokenSet(),
    });
    const request = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as {
      ad_list: { id: string }[];
    };

    expect(request.ad_list[0]?.id).toBe("olx_existing_123");
    expect(result.externalId).toBe("olx_existing_123");
  });

  it("unpublishes listings with the Autoupload delete operation", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        jsonResponse({ statusCode: 0, token: "delete_import_token" }),
      );

    const result = await createOlxTestGateway(fetch).runListingSync({
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
});
