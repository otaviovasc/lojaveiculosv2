import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CrmWhatsappConfigureWebhooksInput,
  CrmWhatsappConfigureWebhooksResult,
} from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp webhook auto-configuration", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;
  const originalToken = process.env.CRM_ZAPI_WEBHOOK_TOKEN;

  afterEach(() => {
    if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalApiBaseUrl;
    if (originalToken === undefined) delete process.env.CRM_ZAPI_WEBHOOK_TOKEN;
    else process.env.CRM_ZAPI_WEBHOOK_TOKEN = originalToken;
  });

  it("registers every ZAPI webhook with the env token appended", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    process.env.CRM_ZAPI_WEBHOOK_TOKEN = "webhook-secret";
    const configureWebhooks = vi.fn(
      async (
        _connection: CrmConnection,
        input: CrmWhatsappConfigureWebhooksInput,
      ): Promise<CrmWhatsappConfigureWebhooksResult> => ({
        results: input.webhooks.map((webhook) => ({
          error: null,
          ok: true,
          status: 200,
          type: webhook.type,
          url: webhook.url,
        })),
      }),
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        configureWebhooks,
        getConnectionStatus: vi.fn(),
        sendText: vi.fn(),
      },
    });

    const response = await app.request(
      `https://attacker.example/api/v1/crm/whatsapp/connections/${connectionId}/webhooks/configure`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    const body =
      (await response.json()) as CrmWhatsappConfigureWebhooksResult & {
        tokenApplied: boolean;
      };
    expect(body.tokenApplied).toBe(true);
    expect(body.results).toHaveLength(6);
    for (const result of body.results) {
      expect(result.url).not.toContain("webhook-secret");
      expect(result.url).not.toContain("token=");
    }

    expect(configureWebhooks).toHaveBeenCalledTimes(1);
    const input = configureWebhooks.mock.calls[0]?.[1];
    expect(input?.webhooks.map((webhook) => webhook.type)).toEqual([
      "received",
      "delivery",
      "status",
      "connected",
      "disconnected",
      "chat-presence",
    ]);
    for (const webhook of input?.webhooks ?? []) {
      expect(webhook.url.startsWith("https://api.trusted.test/")).toBe(true);
      expect(webhook.url).toContain(
        `/whatsapp/webhooks/zapi/${connectionId}/${webhook.type}`,
      );
      expect(webhook.url).toContain("?token=webhook-secret");
    }
  });

  it("registers webhooks without a token when none is configured", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    delete process.env.CRM_ZAPI_WEBHOOK_TOKEN;
    const configureWebhooks = vi.fn(
      async (
        _connection: CrmConnection,
        input: CrmWhatsappConfigureWebhooksInput,
      ): Promise<CrmWhatsappConfigureWebhooksResult> => ({
        results: input.webhooks.map((webhook) => ({
          error: null,
          ok: true,
          status: 200,
          type: webhook.type,
          url: webhook.url,
        })),
      }),
    );
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        configureWebhooks,
        getConnectionStatus: vi.fn(),
        sendText: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/connections/${connectionId}/webhooks/configure`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    const input = configureWebhooks.mock.calls[0]?.[1];
    for (const webhook of input?.webhooks ?? []) {
      expect(webhook.url).not.toContain("token=");
    }
  });

  it("rejects official connections and untrusted shared-token destinations", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    process.env.CRM_ZAPI_WEBHOOK_TOKEN = "webhook-secret";
    const configureWebhooks = vi.fn();
    const officialApp = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection({ provider: "composio_whatsapp" }),
      ]),
      crmWhatsappGateway: { configureWebhooks },
    });
    const untrustedApp = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection({
          webhookUrl: "https://attacker.example/callbacks",
        }),
      ]),
      crmWhatsappGateway: { configureWebhooks },
    });

    const official = await officialApp.request(
      `/api/v1/crm/whatsapp/connections/${connectionId}/webhooks/configure`,
      { method: "POST" },
    );
    const untrusted = await untrustedApp.request(
      `/api/v1/crm/whatsapp/connections/${connectionId}/webhooks/configure`,
      { method: "POST" },
    );

    expect(official.status).toBe(409);
    expect(untrusted.status).toBe(409);
    expect(configureWebhooks).not.toHaveBeenCalled();
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: {
      mode: "stored",
      stored: { instanceId: "zapi-instance-1", instanceToken: "zapi-secret" },
    },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: "zapi-instance-1",
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi" as const,
    status: "sandbox" as const,
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}
