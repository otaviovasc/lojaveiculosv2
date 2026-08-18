import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { CrmMessagingGatewayError } from "../../../domains/crm/ports/crmMessagingGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";
import { createAuditSpy, createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000101";

describe("CRM connections", () => {
  it("does not advertise imported OLX connections while the runtime switch is off", async () => {
    const getConnectionStatus = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        {
          broker: "direct",
          channel: "olx_chat",
          credentialsRef: {},
          displayName: "Imported OLX Chat",
          externalConnectionId: null,
          externalInstanceId: null,
          id: "24000000-0000-4000-8000-000000000102",
          metadata: {},
          phone: null,
          provider: "olx",
          status: "active",
          storeId,
          tenantId,
          webhookUrl: null,
        },
      ]),
      crmMessagingGateway: { getConnectionStatus },
    });

    const response = await app.request("/api/v1/crm/channel-connections");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ connections: [] });
    expect(getConnectionStatus).not.toHaveBeenCalled();
  });

  it("rejects customer attempts to update ZAPI instance credentials", async () => {
    const { audit, record } = createAuditSpy();
    const repository = createMemoryCrmConnectionRepository([
      createZapiConnection({ credentialsRef: {}, externalInstanceId: null }),
    ]);
    const app = createTestApp({
      audit,
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) =>
          sealed.replace(/^sealed:/, ""),
        ),
        seal: vi.fn(async ({ plaintext }) => `sealed:${plaintext}`),
      },
      crmConnectionRepository: repository,
      crmMessagingGateway: {
        getConnectionStatus: vi.fn(async () => ({
          checkedAt: new Date("2026-07-02T19:00:00.000Z"),
          connected: false,
          connectedPhone: null,
          providerStatus: "disconnected" as const,
          smartphoneConnected: false,
        })),
        sendMedia: vi.fn(),
        sendText: vi.fn(),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}`,
      {
        body: JSON.stringify({
          instanceCredentials: {
            instanceId: "zapi-instance-1",
            instanceToken: "zapi-secret-token",
          },
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      code: "CRM_MESSAGING_VALIDATION_ERROR",
      message: "Request is invalid.",
    });
    expect(JSON.stringify(body)).not.toContain("zapi-secret-token");
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      "zapi-secret-token",
    );
    await expect(
      repository.findConnectionById(connectionId),
    ).resolves.toMatchObject({
      credentialsRef: {},
    });
  });

  it("disconnects Z-API at the provider before persisting disconnected state", async () => {
    const { audit, record } = createAuditSpy();
    const repository = createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]);
    const disconnectConnection = vi.fn(async () => ({
      disconnected: true as const,
    }));
    const app = createTestApp({
      audit,
      crmConnectionRepository: repository,
      crmMessagingGateway: { disconnectConnection },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/disconnect`,
      { method: "POST" },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: connectionId,
      live: { connected: false, providerStatus: "disconnected" },
      status: "disconnected",
    });
    expect(disconnectConnection).toHaveBeenCalledTimes(1);
    await expect(
      repository.findConnectionById(connectionId),
    ).resolves.toMatchObject({
      credentialsRef: createZapiConnection().credentialsRef,
      status: "disconnected",
    });
    const lifecycleAudits = record.mock.calls
      .map(([event]) => event)
      .filter(
        (event) => event.action === "crm.provider.zapi.connection.disconnect",
      );
    expect(lifecycleAudits.map((event) => event.outcome)).toEqual([
      "attempted",
      "succeeded",
    ]);
  });

  it("keeps local Z-API state connected when the provider rejects disconnect", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]);
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmMessagingGateway: {
        disconnectConnection: vi.fn(async () => {
          throw new CrmMessagingGatewayError(
            "ZAPI did not confirm the WhatsApp disconnection",
          );
        }),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/disconnect`,
      { method: "POST" },
    );

    expect(response.status).toBe(502);
    await expect(
      repository.findConnectionById(connectionId),
    ).resolves.toMatchObject({ status: "active" });
  });

  it("audits and denies Z-API disconnect without the scoped permission", async () => {
    const { audit, record } = createAuditSpy();
    const disconnectConnection = vi.fn();
    const app = createTestApp({
      audit,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: { disconnectConnection },
      permissions: ["crm.conversations.read"],
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/disconnect`,
      { method: "POST" },
    );

    expect(response.status).toBe(403);
    expect(disconnectConnection).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "crm.provider.zapi.connection.disconnect",
        metadata: expect.objectContaining({
          errorName: "AuthorizationError",
        }) as unknown as Record<string, unknown>,
        outcome: "failed",
      }),
    );
  });
});

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
