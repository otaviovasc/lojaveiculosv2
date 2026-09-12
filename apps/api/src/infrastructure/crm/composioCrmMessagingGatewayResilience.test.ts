import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import { createComposioCrmMessagingGateway } from "./composioCrmMessagingGateway.js";
import { resolveComposioCrmCredentials } from "./composioCrmMessagingGatewaySupport.js";

const env = {
  COMPOSIO_API_KEY: "secret-api-key",
  COMPOSIO_API_BASE_URL: "https://composio.test/",
};

describe("Composio CRM gateway resilience", () => {
  it("checks connected-account status through v3.1", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ status: "ACTIVE" }),
    );
    const gateway = createComposioCrmMessagingGateway(env, fetchImpl);

    await expect(
      gateway.getConnectionStatus(createConnection()),
    ).resolves.toMatchObject({
      connected: true,
      providerStatus: "connected",
    });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://composio.test/api/v3.1/connected_accounts/ca_official_1",
    );
  });

  it("surfaces failed connected-account probes as provider errors", async () => {
    const gateway = createComposioCrmMessagingGateway(
      env,
      vi.fn<typeof fetch>(async () =>
        Response.json({ message: "unauthorized" }, { status: 401 }),
      ),
    );

    await expect(
      gateway.getConnectionStatus(createConnection()),
    ).rejects.toThrow("HTTP 401");
  });

  it("aborts provider requests after the configured timeout", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async (_url, request) =>
        new Promise<Response>((_resolve, reject) => {
          request?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const gateway = createComposioCrmMessagingGateway(
      { ...env, COMPOSIO_REQUEST_TIMEOUT_MS: "5" },
      fetchImpl,
    );

    await expect(
      gateway.getConnectionStatus(createConnection()),
    ).rejects.toThrow("Composio request timed out");
  });

  it("keeps the timeout active while reading the provider body", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_url, request) => {
      const signal = request?.signal;
      return new Response(
        new ReadableStream({
          start(controller) {
            signal?.addEventListener(
              "abort",
              () => controller.error(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          },
        }),
      );
    });
    const gateway = createComposioCrmMessagingGateway(
      { ...env, COMPOSIO_REQUEST_TIMEOUT_MS: "5" },
      fetchImpl,
    );

    await expect(
      gateway.getConnectionStatus(createConnection()),
    ).rejects.toThrow("Composio request timed out");
  });

  it.each(["clientToken", "client_secret", "refreshToken", "password"])(
    "rejects raw provider secret field %s",
    (field) => {
      const connection = createConnection({
        metadata: {
          graphVersion: "v25.0",
          nested: { [field]: "must-not-be-stored" },
        },
      });

      expect(() => resolveComposioCrmCredentials(connection, env)).toThrow(
        "Raw provider credentials",
      );
    },
  );

  it("allows only the dedicated Composio API-key env reference", () => {
    const connection = createConnection({
      credentialsRef: {
        composio: { connectedAccountId: "ca_official_1" },
        env: { apiKey: "DATABASE_URL" },
        mode: "composio",
      },
    });
    const unsafeEnv = {
      ...env,
      DATABASE_URL: "postgresql://secret-value",
    };

    expect(() => resolveComposioCrmCredentials(connection, unsafeEnv)).toThrow(
      "Composio API key env reference is invalid",
    );
    try {
      resolveComposioCrmCredentials(connection, unsafeEnv);
    } catch (error) {
      expect(String(error)).not.toContain("DATABASE_URL");
      expect(String(error)).not.toContain("secret-value");
    }
  });
});

function createConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    broker: "composio",
    channel: "whatsapp",
    credentialsRef: {
      composio: { connectedAccountId: "ca_official_1" },
      env: { apiKey: "COMPOSIO_API_KEY" },
      mode: "composio",
    },
    displayName: "Official messaging",
    externalConnectionId: "phone-number-id-1",
    externalInstanceId: null,
    id: "25000000-0000-4000-8000-000000000101",
    metadata: { graphVersion: "v25.0" },
    phone: "5511999999999",
    provider: "meta_cloud",
    status: "active",
    storeId: "store_1" as StoreId,
    tenantId: "tenant_1" as TenantId,
    webhookUrl: null,
    ...overrides,
  };
}
