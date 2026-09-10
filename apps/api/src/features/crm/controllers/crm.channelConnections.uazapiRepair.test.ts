import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import {
  customerStoreId,
  customerTenantId,
} from "./crm.channelConnections.setupRoutes.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  connectionId,
  createGateway,
  createSetupProvider,
  createUazapiConnection,
} from "./crm.channelConnections.uazapiSetup.testSupport.js";

const repairPermissions = [
  "crm.conversations.read",
  "crm.messaging.connection.setup",
  "crm.messaging.credentials.rotate",
] as const;

function disconnectedUazapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return createUazapiConnection({
    status: "disconnected",
    ...overrides,
  });
}

function createRepairApp(
  repository: ReturnType<typeof createMemoryCrmConnectionRepository>,
  options: Parameters<typeof createTestApp>[0] = {},
) {
  return createTestApp({
    crmConnectionRepository: repository,
    crmMessagingGateway: createGateway({}),
    permissions: [...repairPermissions],
    uazapiConnectionSetupProvider: createSetupProvider({
      validateStatus: vi.fn(async () => ({
        connected: true,
        connectedPhone: "5511999990000",
        smartphoneConnected: true,
      })),
    }),
    ...options,
  });
}

function requestCredentialRepair(
  app: ReturnType<typeof createTestApp>,
  body: Record<string, unknown> = {},
) {
  return app.request(
    `/api/v1/crm/channel-connections/${connectionId}/uazapi/credentials`,
    {
      body: JSON.stringify({
        instanceId: "instance-1",
        instanceToken: "replacement-token",
        ...body,
      }),
      headers: { "content-type": "application/json" },
      method: "PUT",
    },
  );
}

describe("CRM uazapi channel connection credential repair", () => {
  it("repairs a disconnected uazapi connection with verified credentials", async () => {
    const repository = createMemoryCrmConnectionRepository([
      disconnectedUazapiConnection(),
    ]);
    const app = createRepairApp(repository);

    const response = await requestCredentialRepair(app);

    const body: unknown = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ id: connectionId, state: "active" });
    expect(JSON.stringify(body)).not.toContain("replacement-token");
    const connections = await repository.listConnections({
      storeId: customerStoreId,
      tenantId: customerTenantId,
    });
    expect(connections).toHaveLength(1);
    expect(connections[0]?.credentialsRef).toMatchObject({
      mode: "stored",
      stored: {
        baseUrl: "sealed:https://uazapi.test",
        instanceId: "sealed:instance-1",
        instanceToken: "sealed:replacement-token",
      },
    });
  });

  it("keeps the prior credentials when the provider cannot verify the new token", async () => {
    const repository = createMemoryCrmConnectionRepository([
      disconnectedUazapiConnection(),
    ]);
    const app = createRepairApp(repository, {
      uazapiConnectionSetupProvider: createSetupProvider({
        validateStatus: vi.fn(async () => {
          throw new Error("provider rejected the instance token");
        }),
      }),
    });

    const response = await requestCredentialRepair(app);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_UAZAPI_CREDENTIAL_VERIFICATION_FAILED",
    });
    await expect(
      repository.listConnections({
        storeId: customerStoreId,
        tenantId: customerTenantId,
      }),
    ).resolves.toMatchObject([
      {
        credentialsRef: {
          stored: { instanceToken: "sealed:instance-token-1" },
        },
        status: "disconnected",
      },
    ]);
  });

  it("rejects a different instance identity", async () => {
    const repository = createMemoryCrmConnectionRepository([
      disconnectedUazapiConnection(),
    ]);
    const validateStatus = vi.fn();
    const app = createRepairApp(repository, {
      uazapiConnectionSetupProvider: createSetupProvider({ validateStatus }),
    });

    const response = await requestCredentialRepair(app, {
      instanceId: "other-instance",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_UAZAPI_IDENTITY_REPLACEMENT_REQUIRES_SUPPORT",
    });
    expect(validateStatus).not.toHaveBeenCalled();
    await expect(
      repository.listConnections({
        storeId: customerStoreId,
        tenantId: customerTenantId,
      }),
    ).resolves.toMatchObject([
      {
        credentialsRef: {
          stored: { instanceToken: "sealed:instance-token-1" },
        },
      },
    ]);
  });

  it("rejects a stale expected revision", async () => {
    const repository = createMemoryCrmConnectionRepository([
      disconnectedUazapiConnection(),
    ]);
    const app = createRepairApp(repository);

    const response = await requestCredentialRepair(app, {
      expectedRevision: 99,
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_UAZAPI_CONNECTION_REVISION_CONFLICT",
    });
  });

  it("does not repair an archived connection", async () => {
    const repository = createMemoryCrmConnectionRepository([
      disconnectedUazapiConnection({ status: "archived" }),
    ]);
    const app = createRepairApp(repository);

    expect((await requestCredentialRepair(app)).status).toBe(404);
  });

  it("does not repair a non-uazapi connection", async () => {
    const repository = createMemoryCrmConnectionRepository([
      disconnectedUazapiConnection({ provider: "zapi" }),
    ]);
    const app = createRepairApp(repository);

    expect((await requestCredentialRepair(app)).status).toBe(404);
  });

  it("requires the credential-rotation permission", async () => {
    const repository = createMemoryCrmConnectionRepository([
      disconnectedUazapiConnection(),
    ]);
    const app = createRepairApp(repository, {
      permissions: ["crm.messaging.connection.setup"],
    });

    expect((await requestCredentialRepair(app)).status).toBe(403);
  });
});
