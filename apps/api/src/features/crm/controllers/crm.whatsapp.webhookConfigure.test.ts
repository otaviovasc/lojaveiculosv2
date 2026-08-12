import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CrmWhatsappConfigureWebhooksInput,
  CrmWhatsappConfigureWebhooksResult,
} from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  createZapiWebhookTestConnection as createZapiConnection,
  secureWebhookSetupOptions as secureSetupOptions,
  webhookSetupConnectionId as connectionId,
  webhookSupportRequest as supportRequest,
} from "./crm.whatsapp.webhookConfigure.testSupport.js";

describe("CRM WhatsApp webhook auto-configuration", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  afterEach(() => {
    if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalApiBaseUrl;
  });

  it("registers every ZAPI webhook with its connection-bound secret", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
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
      ...secureSetupOptions(),
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
      `https://attacker.example/api/v1/crm/whatsapp/support/zapi/connections/${connectionId}/webhooks/configure`,
      supportRequest(),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as CrmWhatsappConfigureWebhooksResult;
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

  it("never registers ZAPI webhooks without connection authentication", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
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
      ...secureSetupOptions(),
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

    expect(response.status).toBe(404);
    expect(configureWebhooks).not.toHaveBeenCalled();
  });
});
