import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const whatsappId = "25000000-0000-4000-8000-000000000301";
const instagramId = "25000000-0000-4000-8000-000000000302";

describe("CRM official messaging connections", () => {
  it("lists official providers without exposing Z-API webhook endpoints", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("composio_whatsapp", whatsappId),
        createConnection("composio_instagram", instagramId),
      ]),
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(async () => ({
          checkedAt: new Date("2026-07-27T12:00:00.000Z"),
          connected: true,
          connectedPhone: null,
          providerStatus: "connected" as const,
          smartphoneConnected: null,
        })),
      },
    });

    const response = await app.request("/api/v1/crm/channel-connections");

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      connections: Array<Record<string, unknown>>;
    };
    expect(body.connections).toHaveLength(2);
    expect(body.connections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: "whatsapp",
          id: whatsappId,
          provider: "meta_cloud",
        }),
        expect.objectContaining({
          channel: "instagram",
          id: instagramId,
          provider: "meta_cloud",
        }),
      ]),
    );
    expect(JSON.stringify(body)).not.toContain("/webhooks/zapi/");
    expect(JSON.stringify(body)).not.toContain("webhookEndpoints");
    expect(JSON.stringify(body)).not.toContain("webhookTokenRequired");
    expect(JSON.stringify(body)).not.toContain("ca_private");
  });

  it("rejects customer attempts to store Composio provider references", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createConnection("composio_whatsapp", whatsappId, {
        credentialsRef: {},
        externalConnectionId: null,
      }),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(async () => ({
          checkedAt: new Date("2026-07-27T12:00:00.000Z"),
          connected: false,
          connectedPhone: null,
          providerStatus: "disconnected" as const,
          smartphoneConnected: null,
        })),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${whatsappId}`,
      {
        body: JSON.stringify({
          composioCredentials: {
            apiKeyEnv: "COMPOSIO_API_KEY",
            connectedAccountId: "ca_private",
            graphVersion: "v25.0",
          },
          externalConnectionId: "phone-number-id-1",
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_WHATSAPP_VALIDATION_ERROR",
      message: "Request is invalid.",
    });
    await expect(
      repository.findConnectionById(whatsappId),
    ).resolves.toMatchObject({
      credentialsRef: {},
      externalConnectionId: null,
    });
  });

  it("rejects provider-mismatched credential shapes", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("composio_instagram", instagramId),
      ]),
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${instagramId}`,
      {
        body: JSON.stringify({
          instanceCredentials: {
            instanceId: "zapi-instance",
            instanceToken: "zapi-secret",
          },
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_WHATSAPP_VALIDATION_ERROR",
      message: "Request is invalid.",
    });
  });

  it("does not expose credential mutation even with integration permission", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("composio_whatsapp", whatsappId),
      ]),
      permissions: ["crm.messaging.connection.setup"],
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${whatsappId}`,
      {
        body: JSON.stringify({
          composioCredentials: {
            apiKeyEnv: "COMPOSIO_API_KEY",
            connectedAccountId: "ca_private",
          },
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_WHATSAPP_VALIDATION_ERROR",
      message: "Request is invalid.",
    });
  });
});

function createConnection(
  provider: "composio_instagram" | "composio_whatsapp",
  id: string,
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: {
      composio: { connectedAccountId: "ca_private" },
      env: { apiKey: "COMPOSIO_API_KEY" },
      mode: "composio",
    },
    displayName: provider,
    externalConnectionId: `${provider}-sender`,
    externalInstanceId: null,
    id,
    metadata: {
      capabilities: {
        inbound: true,
        outbound: true,
        templates: provider === "composio_whatsapp",
      },
      connected: true,
      graphVersion: "v25.0",
      providerConnected: true,
    },
    phone: null,
    provider,
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}
