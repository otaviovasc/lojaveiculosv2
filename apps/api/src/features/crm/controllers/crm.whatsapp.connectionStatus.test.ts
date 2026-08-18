import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.whatsapp.connectionFixtures.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM WhatsApp connection status", () => {
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
      crmWhatsappGateway: { getConnectionStatus },
    });

    const response = await app.request("/api/v1/crm/channel-connections");
    const body = (await response.json()) as { connections: unknown[] };

    expect(response.status).toBe(200);
    expect(body.connections[0]).toMatchObject({
      credentials: {
        apiBaseUrlEnv: "CRM_ZAPI_API_BASE_URL",
        clientTokenEnv: "CRM_ZAPI_TEST_CLIENT_TOKEN",
        instanceIdEnv: "CRM_ZAPI_TEST_INSTANCE_ID",
        instanceTokenEnv: "CRM_ZAPI_TEST_INSTANCE_TOKEN",
        mode: "env",
      },
      displayName: "ZAPI Test Connection",
      id: connectionId,
      live: {
        connected: true,
        connectedPhone: "5511940231407",
        providerStatus: "connected",
      },
      provider: "zapi",
      status: "active",
    });
    expect(JSON.stringify(body)).not.toContain("credentialsRef");
    expect(JSON.stringify(body)).not.toContain("webhookUrl");
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
      },
    });

    const response = await app.request("/api/v1/crm/channel-connections");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      connections: [
        {
          id: connectionId,
          live: {
            connected: null,
            errorMessage: "ZAPI status failed",
            providerStatus: "error",
          },
        },
      ],
    });
  });

  it("lets a scoped connection manager pause and resume a channel", async () => {
    const { audit, record } = createAuditSpy();
    const repository = createMemoryCrmConnectionRepository([
      createConfiguredZapiTestConnection({
        id: connectionId,
        storeId,
        tenantId,
      }),
    ]);
    const app = createTestApp({
      audit,
      crmConnectionRepository: repository,
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(async () => ({
          checkedAt: new Date("2026-08-12T19:00:00.000Z"),
          connected: true,
          connectedPhone: "5511940231407",
          providerStatus: "connected" as const,
          smartphoneConnected: true,
        })),
      },
    });

    const pause = await patchStatus(app, "paused");
    const resume = await patchStatus(app, "active");

    expect(pause.status).toBe(200);
    await expect(pause.json()).resolves.toMatchObject({
      live: { providerStatus: "disconnected" },
      status: "paused",
    });
    expect(resume.status).toBe(200);
    await expect(resume.json()).resolves.toMatchObject({
      live: { providerStatus: "connected" },
      status: "active",
    });
    await expect(
      repository.findConnectionById(connectionId),
    ).resolves.toMatchObject({ status: "active" });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "crm.whatsapp.connection.update" }),
    );
  });

  it("reconciles a re-paired Z-API connection without replacing its history", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createZapiConnection({ status: "disconnected" }),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmWhatsappGateway: {
        getConnectionStatus: vi.fn(async () => ({
          checkedAt: new Date("2026-08-12T22:00:00.000Z"),
          connected: true,
          connectedPhone: "5511999999999",
          providerStatus: "connected" as const,
          smartphoneConnected: true,
        })),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/status/refresh`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: connectionId,
      live: { connected: true, providerStatus: "connected" },
      phone: "5511999999999",
      status: "active",
    });
  });
});

function patchStatus(
  app: ReturnType<typeof createTestApp>,
  status: "active" | "paused",
) {
  return app.request(`/api/v1/crm/channel-connections/${connectionId}`, {
    body: JSON.stringify({ status }),
    headers: { "content-type": "application/json" },
    method: "PATCH",
  });
}

function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides: {
      credentialsRef: {
        env: {
          apiBaseUrl: "CRM_ZAPI_API_BASE_URL",
          clientToken: "CRM_ZAPI_TEST_CLIENT_TOKEN",
          instanceId: "CRM_ZAPI_TEST_INSTANCE_ID",
          instanceToken: "CRM_ZAPI_TEST_INSTANCE_TOKEN",
        },
        mode: "env",
      },
      ...overrides,
    },
    storeId,
    tenantId,
  });
}
