import { describe, expect, it, vi } from "vitest";
import type { CrmUazapiProvisioningProvider } from "../../../domains/crm/ports/crmUazapiProvisioningProvider.js";
import { createTestApp } from "./crm.controller.testSupport.js";

function createProvisioningStub(): CrmUazapiProvisioningProvider & {
  createInstance: ReturnType<typeof vi.fn>;
} {
  return {
    createInstance: vi.fn(async ({ name }: { name: string }) => ({
      baseUrl: "https://uazapi.test",
      instanceId: name,
      instanceToken: "instance-token-1",
    })),
    deleteInstance: vi.fn(async () => undefined),
  } as CrmUazapiProvisioningProvider & {
    createInstance: ReturnType<typeof vi.fn>;
  };
}

describe("CRM channel connection creation with uazapi", () => {
  it("creates a server-provisioned uazapi WhatsApp connection", async () => {
    const provisioning = createProvisioningStub();
    const app = createTestApp({
      crmUazapiProvisioningProvider: provisioning,
    });

    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        channel: "whatsapp",
        connectionPhoneNumber: "5511999990000",
        displayName: "WhatsApp Loja",
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
  });

  it("rejects uazapi creation payloads that include zapi credentials", async () => {
    const app = createTestApp({
      crmUazapiProvisioningProvider: createProvisioningStub(),
    });

    const response = await app.request("/api/v1/crm/channel-connections", {
      body: JSON.stringify({
        channel: "whatsapp",
        instanceId: "not-allowed",
        provider: "uazapi",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
  });
});
