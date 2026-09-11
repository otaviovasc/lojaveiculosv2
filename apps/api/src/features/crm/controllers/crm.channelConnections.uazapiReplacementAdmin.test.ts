import { describe, expect, it, vi } from "vitest";
import type { CrmUazapiProvisioningProvider } from "../../../domains/crm/ports/crmUazapiProvisioningProvider.js";
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

function createProvisioningStub(): CrmUazapiProvisioningProvider & {
  createInstance: ReturnType<typeof vi.fn>;
  deleteInstance: ReturnType<typeof vi.fn>;
  listInstances: ReturnType<typeof vi.fn>;
} {
  return {
    createInstance: vi.fn(async ({ name }: { name: string }) => ({
      baseUrl: "https://uazapi.test",
      instanceId: name,
      instanceToken: "created-instance-token",
    })),
    deleteInstance: vi.fn(async () => undefined),
    listInstances: vi.fn(async () => [
      {
        connectedPhone: null,
        id: "instance-2",
        name: "Instância nova",
        status: "disconnected",
        token: "server-token-2",
      },
    ]),
  } as CrmUazapiProvisioningProvider & {
    createInstance: ReturnType<typeof vi.fn>;
    deleteInstance: ReturnType<typeof vi.fn>;
    listInstances: ReturnType<typeof vi.fn>;
  };
}

function createAdminReplacementApp(
  repository: ReturnType<typeof createMemoryCrmConnectionRepository>,
  options: {
    provisioning?: ReturnType<typeof createProvisioningStub>;
    validateStatus?: () => Promise<{
      connected: boolean;
      connectedPhone: string | null;
      smartphoneConnected: boolean;
    }>;
  } = {},
) {
  return createTestApp({
    crmConnectionRepository: repository,
    crmMessagingGateway: createGateway({}),
    crmUazapiProvisioningProvider:
      options.provisioning ?? createProvisioningStub(),
    permissions: [
      "crm.conversations.read",
      "crm.messaging.connection.setup",
      "crm.messaging.credentials.rotate",
    ],
    uazapiConnectionSetupProvider: createSetupProvider({
      validateStatus: vi.fn(
        options.validateStatus ??
          (async () => ({
            connected: true,
            connectedPhone: "5511999990000",
            smartphoneConnected: true,
          })),
      ),
    }),
  });
}

function requestAdminReplacement(
  app: ReturnType<typeof createTestApp>,
  candidate: Record<string, unknown>,
) {
  return app.request(
    `/api/v1/crm/channel-connections/${connectionId}/uazapi/replacement`,
    {
      body: JSON.stringify({
        adminToken: "store-admin-token",
        expectedRevision: 0,
        idempotencyKey: "replacement-admin-key-1",
        ...candidate,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    },
  );
}

describe("CRM uazapi replacement with the store admin token", () => {
  it("attaches an account instance using the server-side token", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const provisioning = createProvisioningStub();
    const app = createAdminReplacementApp(repository, { provisioning });

    const response = await requestAdminReplacement(app, {
      instanceId: "instance-2",
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      connection: Record<string, unknown>;
      status: string;
    };
    expect(body.status).toBe("completed");
    expect(JSON.stringify(body)).not.toContain("server-token-2");
    expect(JSON.stringify(body)).not.toContain("store-admin-token");
    expect(provisioning.listInstances).toHaveBeenCalledWith({
      adminToken: "store-admin-token",
      baseUrl: "https://uazapi.test",
    });
    await expect(
      repository.listConnections({
        storeId: customerStoreId,
        tenantId: customerTenantId,
      }),
    ).resolves.toMatchObject([
      {
        credentialsRef: {
          stored: {
            adminToken: "sealed:store-admin-token",
            instanceId: "sealed:instance-2",
            instanceToken: "sealed:server-token-2",
            webhookSecret: "sealed:webhook-secret",
          },
        },
        status: "active",
      },
    ]);
  });

  it("creates a fresh instance through the provider when none is chosen", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const provisioning = createProvisioningStub();
    const app = createAdminReplacementApp(repository, { provisioning });

    const response = await requestAdminReplacement(app, {
      createInstance: { name: "instancia-reposicao" },
    });

    expect(response.status).toBe(200);
    expect(provisioning.createInstance).toHaveBeenCalledWith({
      adminToken: "store-admin-token",
      baseUrl: "https://uazapi.test",
      name: "instancia-reposicao",
    });
    expect(provisioning.deleteInstance).not.toHaveBeenCalled();
    await expect(
      repository.listConnections({
        storeId: customerStoreId,
        tenantId: customerTenantId,
      }),
    ).resolves.toMatchObject([
      {
        credentialsRef: {
          stored: {
            adminToken: "sealed:store-admin-token",
            instanceId: "sealed:instancia-reposicao",
            instanceToken: "sealed:created-instance-token",
          },
        },
        status: "active",
      },
    ]);
  });

  it("deletes a freshly created instance when verification fails", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const provisioning = createProvisioningStub();
    const app = createAdminReplacementApp(repository, {
      provisioning,
      validateStatus: async () => {
        throw new Error("provider rejected the candidate token");
      },
    });

    const response = await requestAdminReplacement(app, {
      createInstance: {},
    });

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(provisioning.deleteInstance).toHaveBeenCalledTimes(1);
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

  it("rejects an attach for an instance missing from the admin account", async () => {
    const repository = createMemoryCrmConnectionRepository([
      createUazapiConnection({ status: "disconnected" }),
    ]);
    const app = createAdminReplacementApp(repository);

    const response = await requestAdminReplacement(app, {
      instanceId: "missing-instance",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_UAZAPI_INSTANCE_NOT_FOUND",
    });
  });
});
