import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CrmWhatsappConfigureWebhooksInput,
  CrmWhatsappConfigureWebhooksResult,
} from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";
import {
  createZapiWebhookTestConnection,
  secureWebhookSetupOptions,
  webhookSetupConnectionId,
  webhookSupportRequest,
} from "./crm.whatsapp.webhookConfigure.testSupport.js";

describe("CRM WhatsApp webhook reset", () => {
  const originalApiBaseUrl = process.env.API_BASE_URL;

  afterEach(() => {
    if (originalApiBaseUrl === undefined) delete process.env.API_BASE_URL;
    else process.env.API_BASE_URL = originalApiBaseUrl;
  });

  it("resets an already configured connection to all six canonical callbacks", async () => {
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
          verified: true,
        })),
      }),
    );
    const configured = createZapiWebhookTestConnection();
    configured.metadata = withZapiWebhookSetupState(configured.metadata, {
      ...createZapiWebhookSetupIntent(webhookSetupConnectionId),
      attemptCount: 1,
      configuredAt: "2026-08-12T12:00:00.000Z",
      status: "configured",
      succeededTypes: [
        "chat-presence",
        "connected",
        "delivery",
        "disconnected",
        "received",
        "status",
      ],
    });
    const repository = createMemoryCrmConnectionRepository([configured]);
    const app = createTestApp({
      ...secureWebhookSetupOptions(),
      crmConnectionRepository: repository,
      crmWhatsappGateway: { configureWebhooks },
    });

    const response = await app.request(
      `/api/v1/crm/whatsapp/support/zapi/connections/${webhookSetupConnectionId}/webhooks/reset`,
      webhookSupportRequest(),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      results: CrmWhatsappConfigureWebhooksResult["results"];
      setup: { attemptCount: number; status: string };
    };
    expect(body.results).toHaveLength(6);
    expect(body.results.every((result) => result.ok)).toBe(true);
    expect(body.setup).toMatchObject({ attemptCount: 2, status: "configured" });
    expect(configureWebhooks).toHaveBeenCalledTimes(1);
    const callbacks = configureWebhooks.mock.calls[0]?.[1].webhooks ?? [];
    expect(callbacks).toHaveLength(6);
    expect(
      callbacks.every(({ url }) => url.startsWith("https://api.trusted.test/")),
    ).toBe(true);
    expect(JSON.stringify(body)).not.toContain("webhook-secret");

    const repeated = await app.request(
      `/api/v1/crm/whatsapp/support/zapi/connections/${webhookSetupConnectionId}/webhooks/reset`,
      webhookSupportRequest(),
    );
    expect(repeated.status).toBe(200);
    expect(configureWebhooks).toHaveBeenCalledTimes(2);
  });

  it("rejects official connections and untrusted shared-token destinations", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    const configureWebhooks = vi.fn();
    const officialApp = createTestApp({
      ...secureWebhookSetupOptions(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiWebhookTestConnection({ provider: "composio_whatsapp" }),
      ]),
      crmWhatsappGateway: { configureWebhooks },
    });
    const untrustedApp = createTestApp({
      ...secureWebhookSetupOptions(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiWebhookTestConnection({
          webhookUrl: "https://attacker.example/callbacks",
        }),
      ]),
      crmWhatsappGateway: { configureWebhooks },
    });

    const official = await officialApp.request(
      `/api/v1/crm/whatsapp/support/zapi/connections/${webhookSetupConnectionId}/webhooks/configure`,
      webhookSupportRequest(),
    );
    const untrusted = await untrustedApp.request(
      `/api/v1/crm/whatsapp/support/zapi/connections/${webhookSetupConnectionId}/webhooks/configure`,
      webhookSupportRequest(),
    );

    expect(official.status).toBe(409);
    expect(untrusted.status).toBe(409);
    expect(configureWebhooks).not.toHaveBeenCalled();
  });
});
