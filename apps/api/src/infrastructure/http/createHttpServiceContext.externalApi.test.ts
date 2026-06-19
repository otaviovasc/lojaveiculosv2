import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { ExternalApiRepository } from "../../domains/externalApi/ports/externalApiRepository.js";
import { hashExternalApiKey } from "../../domains/externalApi/crypto/apiKeyCrypto.js";
import {
  createHttpServiceContext,
  HttpContextRequestPolicyError,
} from "./createHttpServiceContext.js";

describe("createHttpServiceContext external API auth", () => {
  it("resolves scoped integration context from external API key", async () => {
    const apiKey = "lv2_testprefix_secret";
    const externalApiRepository = createExternalApiRepository(apiKey);
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory/listings", {
        headers: {
          "x-api-key": apiKey,
          "x-request-id": "req_api",
        },
      }),
    );

    const serviceContext = await createHttpServiceContext(context, {
      externalApiRepository,
    });

    expect(serviceContext.actor).toEqual({
      displayName: "DMS integration",
      externalId: "lv2_testprefix",
      id: "api_client_1",
      kind: "integration",
    });
    expect(serviceContext.permissions).toEqual(["inventory.read"]);
    expect(serviceContext.storeId).toBe("store_1");
    expect(serviceContext.tenantId).toBe("tenant_1");
  });

  it("requires idempotency keys for external API mutations", async () => {
    const apiKey = "lv2_testprefix_secret";
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory/listings", {
        headers: { "x-api-key": apiKey },
        method: "POST",
      }),
    );

    await expect(
      createHttpServiceContext(context, {
        externalApiRepository: createExternalApiRepository(apiKey),
      }),
    ).rejects.toThrow(HttpContextRequestPolicyError);
  });

  it("rejects external API requests above the per-minute rate limit", async () => {
    const apiKey = "lv2_testprefix_secret";
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory/listings", {
        headers: { "x-api-key": apiKey },
      }),
    );

    await expect(
      createHttpServiceContext(context, {
        externalApiRepository: createExternalApiRepository(apiKey, {
          recentRequests: 120,
        }),
      }),
    ).rejects.toMatchObject({ statusCode: 429 });
  });

  it("rejects duplicate external API idempotency keys", async () => {
    const apiKey = "lv2_testprefix_secret";
    const context = await captureContext(
      new Request("https://api.local/api/v1/inventory/listings", {
        headers: {
          "idempotency-key": "idem_1",
          "x-api-key": apiKey,
        },
        method: "POST",
      }),
    );

    await expect(
      createHttpServiceContext(context, {
        externalApiRepository: createExternalApiRepository(apiKey, {
          reserveKind: "duplicate",
        }),
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

function createExternalApiRepository(
  apiKey: string,
  options: {
    recentRequests?: number;
    reserveKind?: "created" | "duplicate";
  } = {},
): ExternalApiRepository {
  return {
    authenticateByKeyHash: async (input) =>
      input.keyHash === hashExternalApiKey(apiKey)
        ? {
            clientId: "api_client_1",
            clientName: "DMS integration",
            entitlements: ["external_api" as const],
            keyId: "api_key_1",
            keyPrefix: "lv2_testprefix",
            scopes: ["inventory.read" as const],
            storeId: "store_1" as never,
            tenantId: "tenant_1" as never,
          }
        : null,
    countRecentRequests: async () => options.recentRequests ?? 0,
    createClient: vi.fn(),
    listClients: vi.fn(),
    recordRequest: vi.fn(),
    reserveIdempotencyKey: async () =>
      options.reserveKind === "duplicate"
        ? { kind: "duplicate", statusCode: 201 }
        : { kind: "created" },
    revokeClient: vi.fn(),
  };
}

async function captureContext(request: Request) {
  let captured: unknown;
  const app = new Hono();
  app.all("*", (context) => {
    captured = context;
    return context.json({ ok: true });
  });

  await app.request(request);
  return captured as Parameters<typeof createHttpServiceContext>[0];
}
