import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type {
  CrmMessagingConfigureWebhooksInput,
  CrmMessagingConfigureWebhooksResult,
} from "../../../domains/crm/ports/crmMessagingGateway.js";
import {
  connectionId,
  createConnection,
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  disconnectedZapiRepository,
  listStoredConnections,
  requestCredentialRepair,
} from "./crm.channelConnections.repair.testSupport.js";

describe("CRM channel connection repair", () => {
  it("requires connection setup permission", async () => {
    const repository = disconnectedZapiRepository();
    const app = createTestApp({
      crmConnectionRepository: repository,
      permissions: ["crm.messaging.credentials.rotate"],
    });
    const response = await requestCredentialRepair(app, "replacement-instance");

    expect(response.status).toBe(403);
    await expect(listStoredConnections(repository)).resolves.toMatchObject([
      {
        credentialsRef: {
          stored: { instanceToken: "sealed:expired-token" },
        },
        id: connectionId,
        status: "disconnected",
      },
    ]);
  });

  it("requires credential-rotation permission", async () => {
    const app = createTestApp({
      permissions: ["crm.messaging.connection.setup"],
    });
    const response = await requestCredentialRepair(app);

    expect(response.status).toBe(403);
  });

  it("requires the base CRM entitlement", async () => {
    const repository = disconnectedZapiRepository();
    const app = createTestApp({
      crmConnectionRepository: repository,
      entitlements: [],
      permissions: [
        "crm.messaging.connection.setup",
        "crm.messaging.credentials.rotate",
      ],
    });
    const response = await requestCredentialRepair(app, "replacement-instance");

    expect(response.status).toBe(403);
    await expect(listStoredConnections(repository)).resolves.toMatchObject([
      {
        credentialsRef: {
          stored: { instanceToken: "sealed:expired-token" },
        },
        id: connectionId,
        status: "disconnected",
      },
    ]);
  });

  it("rejects customer identity replacement without archiving the connection", async () => {
    const repository = disconnectedZapiRepository();
    const configureWebhooks = vi.fn();
    const validateStatus = vi.fn();
    const app = createTestApp({
      crmConnectionRepository: repository,
      crmMessagingGateway: { configureWebhooks },
      permissions: [
        "crm.messaging.connection.setup",
        "crm.messaging.credentials.rotate",
      ],
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(),
        getQrCode: vi.fn(),
        validateStatus,
      },
    });
    const response = await requestCredentialRepair(app, "replacement-instance");

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_ZAPI_IDENTITY_REPLACEMENT_REQUIRES_SUPPORT",
    });
    await expect(listStoredConnections(repository)).resolves.toMatchObject([
      {
        credentialsRef: {
          stored: { instanceToken: "sealed:expired-token" },
        },
        id: connectionId,
        status: "disconnected",
      },
    ]);
    expect(configureWebhooks).not.toHaveBeenCalled();
    expect(validateStatus).not.toHaveBeenCalled();
  });

  it("repairs a disconnected Z-API connection without creating a duplicate", async () => {
    const repository = disconnectedZapiRepository();
    const app = createTestApp({
      crmConnectionCredentialVault: {
        open: vi.fn(async ({ sealed }: { sealed: string }) =>
          sealed.replace(/^sealed:/u, ""),
        ),
        seal: vi.fn(
          async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
        ),
      },
      crmConnectionRepository: repository,
      crmMessagingGateway: {
        configureWebhooks: vi.fn(
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
        ),
      },
      permissions: [
        "crm.conversations.read",
        "crm.messaging.connection.setup",
        "crm.messaging.credentials.rotate",
      ],
      zapiConnectionSetupProvider: {
        getPairingCode: vi.fn(),
        getQrCode: vi.fn(),
        validateStatus: vi.fn(async () => ({
          connected: true,
          connectedPhone: "5511999999999",
          smartphoneConnected: true,
        })),
      },
    });

    const response = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/zapi/credentials`,
      {
        body: JSON.stringify({
          clientToken: "replacement-client-token",
          instanceId: "instance-1",
          instanceToken: "replacement-token",
        }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      },
    );

    const body: unknown = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: connectionId,
      readiness: { ready: true, reasonCode: "ready" },
      state: "active",
    });
    expect(JSON.stringify(body)).not.toContain("replacement-token");
    const connections = await repository.listConnections({
      storeId: customerStoreId,
      tenantId: customerTenantId,
    });
    expect(connections).toHaveLength(1);
    expect(connections[0]?.credentialsRef).toMatchObject({
      mode: "stored",
      stored: { instanceToken: "sealed:replacement-token" },
    });
  });
});
