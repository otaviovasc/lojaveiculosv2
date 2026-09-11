import { describe, expect, it, vi } from "vitest";
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

const replacementPermissions = [
  "crm.conversations.read",
  "crm.messaging.connection.setup",
  "crm.messaging.credentials.rotate",
] as const;

function createReplacementApp(
  repository: ReturnType<typeof createMemoryCrmConnectionRepository>,
  options: Parameters<typeof createTestApp>[0] = {},
) {
  return createTestApp({
    crmConnectionRepository: repository,
    crmMessagingGateway: createGateway({}),
    permissions: [...replacementPermissions],
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

function requestReplacement(
  app: ReturnType<typeof createTestApp>,
  body: Record<string, unknown> = {},
) {
  return app.request(
    `/api/v1/crm/channel-connections/${connectionId}/uazapi/replacement`,
    {
      body: JSON.stringify({
        expectedRevision: 0,
        idempotencyKey: "replacement-key-1",
        instanceId: "instance-2",
        instanceToken: "new-instance-token",
        ...body,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
}

describe("CRM uazapi channel connection replacement", () => {
  it("re-points the connection to the verified new instance preserving history", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const app = createReplacementApp(repository);

    const response = await requestReplacement(app);

    const body = (await response.json()) as {
      connection: Record<string, unknown>;
      operationId: string;
      status: string;
    };
    expect(response.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.operationId).toBeTruthy();
    expect(body.connection).toMatchObject({
      id: connectionId,
      state: "active",
    });
    expect(JSON.stringify(body)).not.toContain("new-instance-token");
    const connections = await repository.listConnections({
      storeId: customerStoreId,
      tenantId: customerTenantId,
    });
    expect(connections).toHaveLength(1);
    expect(connections[0]).toMatchObject({
      credentialsRef: {
        mode: "stored",
        stored: {
          baseUrl: "sealed:https://uazapi.test",
          instanceId: "sealed:instance-2",
          instanceToken: "sealed:new-instance-token",
          webhookSecret: "sealed:webhook-secret",
        },
      },
      externalInstanceId: null,
      id: connectionId,
      status: "active",
    });
    expect(connections[0]?.metadata.uazapiWebhookSetup).toMatchObject({
      state: "pending",
    });
  });

  it("serves the replacement status for the same operation id", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const app = createReplacementApp(repository);

    const started = await requestReplacement(app);
    const { operationId } = (await started.json()) as { operationId: string };

    const polled = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/replacement/${operationId}`,
      { method: "GET" },
    );

    expect(polled.status).toBe(200);
    await expect(polled.json()).resolves.toMatchObject({
      operationId,
      status: "completed",
    });

    const missing = await app.request(
      `/api/v1/crm/channel-connections/${connectionId}/uazapi/replacement/${crypto.randomUUID()}`,
      { method: "GET" },
    );
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toMatchObject({
      code: "CRM_UAZAPI_REPLACEMENT_NOT_FOUND",
    });
  });

  it("rejects a stale expected revision without touching credentials", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const app = createReplacementApp(repository);

    const response = await requestReplacement(app, { expectedRevision: 99 });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_UAZAPI_REPLACEMENT_REVISION_CONFLICT",
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
      },
    ]);
  });

  it("keeps the current instance when the provider cannot verify the candidate", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const app = createReplacementApp(repository, {
      uazapiConnectionSetupProvider: createSetupProvider({
        validateStatus: vi.fn(async () => {
          throw new Error("provider rejected the candidate token");
        }),
      }),
    });

    const response = await requestReplacement(app);

    expect(response.status).toBeGreaterThanOrEqual(500);
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

  it("requires the credential-rotation permission", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const app = createReplacementApp(repository, {
      permissions: ["crm.messaging.connection.setup"],
    });

    expect((await requestReplacement(app)).status).toBe(403);
  });
});
