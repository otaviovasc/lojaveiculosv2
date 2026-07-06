import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp connections", () => {
  it("lists ZAPI connections with live provider status", async () => {
    const { audit, record } = createAuditSpy();
    const getConnectionStatus = vi.fn(async () => ({
      checkedAt: new Date("2026-07-02T19:00:00.000Z"),
      connected: true,
      connectedPhone: "5511940231407",
      providerStatus: "connected" as const,
      smartphoneConnected: true,
    }));
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: {
        getConnectionStatus,
        sendMedia: vi.fn(),
        sendText: vi.fn(),
      },
    });

    const response = await app.request("/api/v1/crm/whatsapp/connections");

    expect(response.status).toBe(200);
    const body = (await response.json()) as { connections: unknown[] };
    expect(body.connections[0]).toMatchObject({
      credentials: {
        apiBaseUrlEnv: "CRM_ZAPI_API_BASE_URL",
        clientTokenEnv: "CRM_ZAPI_TEST_CLIENT_TOKEN",
        instanceIdEnv: "CRM_ZAPI_TEST_INSTANCE_ID",
        instanceTokenEnv: "CRM_ZAPI_TEST_INSTANCE_TOKEN",
        mode: "env",
      },
      displayName: "ZAPI Test Connection",
      externalConnectionId: null,
      externalInstanceId: null,
      id: connectionId,
      live: {
        checkedAt: "2026-07-02T19:00:00.000Z",
        connected: true,
        connectedPhone: "5511940231407",
        providerStatus: "connected",
        smartphoneConnected: true,
      },
      metadata: {
        catalogPhone: null,
        connectedPhone: null,
        migrationUnit: null,
        purpose: null,
      },
      phone: null,
      provider: "zapi",
      status: "sandbox",
      webhookTokenRequired: false,
      webhookUrl: null,
    });
    expect(JSON.stringify(body)).toContain("/webhooks/zapi/");
    expect(JSON.stringify(body)).not.toContain("credentialsRef");
    expect(getConnectionStatus).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      action: "crm.whatsapp.connections.list",
      category: "data_access",
    });
  });

  it("keeps connection listing available when ZAPI status fails", async () => {
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection({ credentialsRef: { env: {}, mode: "env" } }),
      ]),
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(async () => {
          throw new Error("ZAPI status failed");
        }),
        sendMedia: vi.fn(),
        sendText: vi.fn(),
      },
    });

    const response = await app.request("/api/v1/crm/whatsapp/connections");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      connections: [
        {
          id: connectionId,
          live: {
            connected: null,
            connectedPhone: null,
            errorMessage: "ZAPI status failed",
            providerStatus: "error",
            smartphoneConnected: null,
          },
        },
      ],
    });
  });
});

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    credentialsRef: {
      env: {
        apiBaseUrl: "CRM_ZAPI_API_BASE_URL",
        clientToken: "CRM_ZAPI_TEST_CLIENT_TOKEN",
        instanceId: "CRM_ZAPI_TEST_INSTANCE_ID",
        instanceToken: "CRM_ZAPI_TEST_INSTANCE_TOKEN",
      },
      mode: "env",
    },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
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
