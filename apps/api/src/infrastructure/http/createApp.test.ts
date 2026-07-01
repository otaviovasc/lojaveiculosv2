import { describe, expect, it, vi } from "vitest";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import { hashExternalApiKey } from "../../domains/externalApi/crypto/apiKeyCrypto.js";
import { createInventoryTestServices } from "../../features/inventory/controllers/vehicle.controller.testSupport.js";
import { createApp } from "./createApp.js";

describe("API middleware", () => {
  it("applies security and CORS headers to normal responses", async () => {
    const app = createApp();

    const response = await app.request("/health", {
      headers: { Origin: "https://app.lojaveiculos.local" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-expose-headers")).toBe(
      "X-Request-Id",
    );
    expect(response.headers.get("x-request-id")).toEqual(expect.any(String));
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("handles CORS preflight before feature routing", async () => {
    const app = createApp();

    const response = await app.request("/api/v1/inventory/listings", {
      headers: {
        "Access-Control-Request-Headers": "Authorization,X-Request-Id",
        "Access-Control-Request-Method": "GET",
        Origin: "https://app.lojaveiculos.local",
      },
      method: "OPTIONS",
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET,HEAD,POST,PUT,PATCH,DELETE",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Authorization,Content-Type,Idempotency-Key,X-API-Key,X-Clerk-User-Id,X-Idempotency-Key,X-Request-Id,X-Store-Slug,X-Store-Id,X-User-Email,X-User-Name",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects oversized request bodies before controllers parse them", async () => {
    const app = createApp();
    const oversizedBody = JSON.stringify({ value: "x".repeat(1024 * 1024) });

    const response = await app.request(
      "/api/v1/public/storefront/listings/listing_1/leads",
      {
        body: oversizedBody,
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(413);
    const body = (await response.json()) as {
      code?: string;
      message?: string;
      requestId?: unknown;
    };
    expect(body).toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      message: "Payload too large.",
    });
    expect(typeof body.requestId).toBe("string");
  });

  it("passes external API repositories into mounted runtime routes", async () => {
    const apiKey = "lv2_testprefix_secret";
    const inventoryListingServices = createInventoryTestServices();
    const externalApiRepository = createExternalApiRepository(apiKey);
    const app = createApp({
      externalApiRepository,
      inventoryListingServices,
    });

    const response = await app.request("/api/v1/external-api/vehicles", {
      headers: { "x-api-key": apiKey },
    });

    expect(response.status).toBe(200);
    expect(inventoryListingServices.listListings).toHaveBeenCalled();
    expect(externalApiRepository.recordRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "api_client_1",
        path: "/api/v1/external-api/vehicles",
        statusCode: 200,
      }),
    );
  });
});

function createExternalApiRepository(apiKey: string): ExternalApiRepository {
  return {
    authenticateByKeyHash: async (input) =>
      input.keyHash === hashExternalApiKey(apiKey)
        ? {
            clientId: "api_client_1",
            clientName: "Website builder",
            entitlements: ["external_api" as const],
            keyId: "api_key_1",
            keyPrefix: "lv2_testprefix",
            scopes: ["inventory.read" as const],
            storeId: "store_1" as never,
            tenantId: "tenant_1" as never,
          }
        : null,
    countRecentRequests: vi.fn(async () => 0),
    createClient: vi.fn(),
    listClients: vi.fn(),
    recordRequest: vi.fn(),
    reserveIdempotencyKey: vi.fn(async () => ({ kind: "created" as const })),
    revokeClient: vi.fn(),
  };
}
