import { describe, expect, it } from "vitest";
import { createTestApp } from "./crm.controller.testSupport.js";
import { createUazapiProvisioningStub } from "./crm.channelConnections.uazapiCreate.testSupport.js";

describe("CRM uazapi connection creation limit", () => {
  it("rejects a fourth WhatsApp connection with an honest limit error", async () => {
    const provisioning = createUazapiProvisioningStub();
    const app = createTestApp({
      crmUazapiProvisioningProvider: provisioning,
    });
    const createConnection = (displayName: string) =>
      app.request("/api/v1/crm/channel-connections", {
        body: JSON.stringify({
          adminToken: "store-admin-token",
          channel: "whatsapp",
          displayName,
          mode: "create",
          provider: "uazapi",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

    for (const displayName of ["Loja 1", "Loja 2", "Loja 3"]) {
      const response = await createConnection(displayName);
      expect(response.status).toBe(201);
    }

    const response = await createConnection("Loja 4");
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      code?: string;
      details?: { limit?: number };
    };
    expect(body.code).toBe("CRM_WHATSAPP_CONNECTION_LIMIT_REACHED");
    expect(body.details?.limit).toBe(3);
  });
});
