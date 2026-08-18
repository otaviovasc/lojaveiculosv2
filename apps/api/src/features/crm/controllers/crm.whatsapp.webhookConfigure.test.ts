import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CrmMessagingConfigureWebhooksInput,
  CrmMessagingConfigureWebhooksResult,
} from "../../../domains/crm/ports/crmMessagingGateway.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import {
  createZapiWebhookSetupIntent,
  requiredZapiWebhookTypes,
  withZapiWebhookSetupState,
} from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
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
        input: CrmMessagingConfigureWebhooksInput,
      ): Promise<CrmMessagingConfigureWebhooksResult> => ({
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
    const app = createTestApp({
      ...secureSetupOptions(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: {
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
    const body = (await response.json()) as CrmMessagingConfigureWebhooksResult;
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

  it("lets the owning customer retry a failed setup and reports provider state honestly", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    const configureWebhooks = vi.fn(
      async (
        _connection: CrmConnection,
        input: CrmMessagingConfigureWebhooksInput,
      ): Promise<CrmMessagingConfigureWebhooksResult> => ({
        results: input.webhooks.map((webhook) => ({
          error: configureWebhooks.mock.calls.length === 1 ? "rejected" : null,
          ok: configureWebhooks.mock.calls.length !== 1,
          status: configureWebhooks.mock.calls.length === 1 ? 503 : 200,
          type: webhook.type,
          url: webhook.url,
          verified: configureWebhooks.mock.calls.length !== 1,
        })),
      }),
    );
    const app = createTestApp({
      ...secureSetupOptions(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection({
          storeId: customerStoreId,
          tenantId: customerTenantId,
        }),
      ]),
      crmMessagingGateway: {
        configureWebhooks,
        getConnectionStatus: vi.fn(),
        sendText: vi.fn(),
      },
    });

    const failed = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/webhooks/configure`,
      { method: "POST" },
    );
    const configured = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/webhooks/configure`,
      { method: "POST" },
    );

    expect(failed.status).toBe(200);
    expect(configured.status).toBe(200);
    const failedBody = (await failed.json()) as {
      results: CrmMessagingConfigureWebhooksResult["results"];
      setup: { attemptCount: number; status: string };
    };
    const configuredBody = (await configured.json()) as typeof failedBody;
    expect(failedBody.setup).toMatchObject({
      attemptCount: 1,
      status: "failed",
    });
    expect(configuredBody.setup).toMatchObject({
      attemptCount: 2,
      status: "configured",
    });
    expect(failedBody.results).toHaveLength(6);
    expect(configuredBody.results).toHaveLength(6);
    expect(configureWebhooks).toHaveBeenCalledTimes(2);
    expect(JSON.stringify({ configuredBody, failedBody })).not.toContain(
      "webhook-secret",
    );
    expect(JSON.stringify({ configuredBody, failedBody })).not.toContain(
      "token=",
    );
  });

  it("rechecks all webhooks when a legacy setup was falsely marked configured", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    const legacy = createZapiWebhookSetupIntent(connectionId);
    const configureWebhooks = vi.fn(
      async (
        _connection: CrmConnection,
        input: CrmMessagingConfigureWebhooksInput,
      ): Promise<CrmMessagingConfigureWebhooksResult> => ({
        results: input.webhooks.map((webhook) => ({
          error: webhook.type === "received" ? "not acknowledged" : null,
          ok: webhook.type !== "received",
          status: 200,
          type: webhook.type,
          url: webhook.url,
          verified: webhook.type !== "received",
        })),
      }),
    );
    const app = createTestApp({
      ...secureSetupOptions(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection({
          metadata: {
            webhookSetup: {
              ...legacy,
              attemptCount: 1,
              configuredAt: legacy.updatedAt,
              status: "configured",
              succeededTypes: requiredZapiWebhookTypes,
              version: 1,
            },
          },
          storeId: customerStoreId,
          tenantId: customerTenantId,
        }),
      ]),
      crmMessagingGateway: {
        configureWebhooks,
        getConnectionStatus: vi.fn(),
        sendText: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/webhooks/configure`,
      { method: "POST" },
    );
    const body = (await response.json()) as {
      results: CrmMessagingConfigureWebhooksResult["results"];
      setup: { attemptCount: number; status: string };
    };

    expect(response.status).toBe(200);
    expect(configureWebhooks).toHaveBeenCalledTimes(1);
    expect(configureWebhooks.mock.calls[0]?.[1].webhooks).toHaveLength(6);
    expect(body.results).toHaveLength(6);
    expect(body.setup).toMatchObject({ attemptCount: 2, status: "partial" });
  });

  it("requires customer setup permission and Z-API entitlement", async () => {
    process.env.API_BASE_URL = "https://api.trusted.test";
    const target = createZapiConnection({
      storeId: customerStoreId,
      tenantId: customerTenantId,
    });
    const withoutPermission = createTestApp({
      ...secureSetupOptions(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([target]),
      permissions: [],
    });
    const withoutEntitlement = createTestApp({
      ...secureSetupOptions(),
      crmConnectionRepository: createMemoryCrmConnectionRepository([target]),
      entitlements: ["crm"],
    });
    const path = `/api/v1/crm/channel-connections/${connectionId}/zapi/webhooks/configure`;

    expect(
      (await withoutPermission.request(path, { method: "POST" })).status,
    ).toBe(403);
    expect(
      (await withoutEntitlement.request(path, { method: "POST" })).status,
    ).toBe(403);
  });
});
