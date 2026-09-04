import { describe, expect, it, vi } from "vitest";
import type { CrmUazapiProvisioningProvider } from "../../../domains/crm/ports/crmUazapiProvisioningProvider.js";
import { CrmConnectionSetupProviderError } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createTestApp } from "./crm.controller.testSupport.js";

function createProvisioningStub(): CrmUazapiProvisioningProvider & {
  createInstance: ReturnType<typeof vi.fn>;
  listInstances: ReturnType<typeof vi.fn>;
} {
  return {
    createInstance: vi.fn(async ({ name }: { name: string }) => ({
      baseUrl: "https://uazapi.test",
      instanceId: name,
      instanceToken: "instance-token-1",
    })),
    deleteInstance: vi.fn(async () => undefined),
    listInstances: vi.fn(async () => [
      {
        connectedPhone: "5511988880000",
        id: "inst-1",
        name: "Loja A",
        status: "connected",
        token: "server-token-1",
      },
    ]),
  } as CrmUazapiProvisioningProvider & {
    createInstance: ReturnType<typeof vi.fn>;
    listInstances: ReturnType<typeof vi.fn>;
  };
}

describe("CRM channel connection creation with uazapi", () => {
  it("creates a BYOK uazapi WhatsApp connection in create mode", async () => {
    const provisioning = createProvisioningStub();
    const app = createTestApp({
      crmUazapiProvisioningProvider: provisioning,
    });

    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        adminToken: "store-admin-token",
        channel: "whatsapp",
        connectionPhoneNumber: "5511999990000",
        displayName: "WhatsApp Loja",
        mode: "create",
        provider: "uazapi",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      displayName: string;
      phoneNumber?: string | null;
      provider: string;
      state: string;
    };
    expect(body).toMatchObject({
      displayName: "WhatsApp Loja",
      phoneNumber: "5511999990000",
      provider: "uazapi",
    });
    expect(provisioning.createInstance).toHaveBeenCalledTimes(1);
    expect(provisioning.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({ adminToken: "store-admin-token" }),
    );
    expect(JSON.stringify(body)).not.toContain("store-admin-token");
  });

  it("attaches an existing uazapi instance with its server-side phone", async () => {
    const provisioning = createProvisioningStub();
    const app = createTestApp({
      crmUazapiProvisioningProvider: provisioning,
    });

    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        adminToken: "store-admin-token",
        channel: "whatsapp",
        displayName: "WhatsApp Loja",
        instanceId: "inst-1",
        mode: "attach",
        provider: "uazapi",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { phoneNumber?: string | null };
    expect(body.phoneNumber).toBe("5511988880000");
    expect(provisioning.createInstance).not.toHaveBeenCalled();
  });

  it("rejects attach for an instance missing from the admin account", async () => {
    const app = createTestApp({
      crmUazapiProvisioningProvider: createProvisioningStub(),
    });

    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        adminToken: "store-admin-token",
        channel: "whatsapp",
        instanceId: "missing",
        mode: "attach",
        provider: "uazapi",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe("CRM_UAZAPI_INSTANCE_NOT_FOUND");
  });

  it("rejects uazapi creation payloads that include zapi credentials", async () => {
    const app = createTestApp({
      crmUazapiProvisioningProvider: createProvisioningStub(),
    });

    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        adminToken: "store-admin-token",
        channel: "whatsapp",
        clientToken: "not-allowed",
        mode: "create",
        provider: "uazapi",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
  });

  it("rejects uazapi payloads without a mode or admin token", async () => {
    const app = createTestApp({
      crmUazapiProvisioningProvider: createProvisioningStub(),
    });

    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        channel: "whatsapp",
        displayName: "WhatsApp Loja",
        provider: "uazapi",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
  });
});

describe("CRM uazapi list-instances endpoint", () => {
  it("lists instances without leaking any token", async () => {
    const provisioning = createProvisioningStub();
    const app = createTestApp({
      crmUazapiProvisioningProvider: provisioning,
    });

    const response = await app.request(
      "/api/v1/crm/channel-connections/uazapi/list-instances",
      {
        body: JSON.stringify({ adminToken: "store-admin-token" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      instances: readonly Record<string, unknown>[];
    };
    expect(body.instances).toEqual([
      {
        connectedPhone: "5511988880000",
        id: "inst-1",
        name: "Loja A",
        status: "connected",
      },
    ]);
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("server-token-1");
    expect(serialized).not.toContain("store-admin-token");
    expect(provisioning.listInstances).toHaveBeenCalledWith({
      adminToken: "store-admin-token",
    });
  });

  it("returns an honest provider error when the admin token is rejected", async () => {
    const provisioning = createProvisioningStub();
    provisioning.listInstances = vi.fn(async () => {
      throw new CrmConnectionSetupProviderError(
        "UAZAPI rejected the admin request",
        "provider_rejected",
        401,
      );
    });
    const app = createTestApp({
      crmUazapiProvisioningProvider: provisioning,
    });

    const response = await app.request(
      "/api/v1/crm/channel-connections/uazapi/list-instances",
      {
        body: JSON.stringify({ adminToken: "bad-token" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(502);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe("CRM_CONNECTION_SETUP_PROVIDER_REJECTED");
  });

  it("rejects invalid payloads", async () => {
    const app = createTestApp({
      crmUazapiProvisioningProvider: createProvisioningStub(),
    });

    const response = await app.request(
      "/api/v1/crm/channel-connections/uazapi/list-instances",
      {
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(400);
  });
});
