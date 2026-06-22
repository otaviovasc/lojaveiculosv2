import { describe, expect, it, vi } from "vitest";
import {
  createRepassesCrmStub,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp connection scope", () => {
  it("rejects stale client connection ids before proxying WhatsApp reads", async () => {
    const repassesCrm = createRepassesCrmStub({
      listSessions: vi.fn(async () => []),
    });
    const app = createTestApp(repassesCrm);

    const response = await app.request(
      "/api/v1/crm/whatsapp/sessions?connectionId=99",
      {
        headers: {
          Authorization: "Bearer clerk-token",
          "x-store-slug": "test-store",
        },
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "CRM WhatsApp connection does not belong to this store.",
    });
    expect(repassesCrm.listSessions).not.toHaveBeenCalled();
  });

  it("rejects a sole Repasses connection that does not match host store scope", async () => {
    const repassesCrm = createRepassesCrmStub({
      getConnections: vi.fn(async () => ({
        connections: [{ id: 10, lojaSlug: "other-store", status: "CONNECTED" }],
      })),
      listSessions: vi.fn(async () => []),
    });
    const app = createTestApp(repassesCrm);

    const response = await app.request("/api/v1/crm/whatsapp/sessions", {
      headers: {
        Authorization: "Bearer clerk-token",
        host: "test-store.lojaveiculos.com.br",
      },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "CRM WhatsApp connection is not scoped to this store.",
    });
    expect(repassesCrm.listSessions).not.toHaveBeenCalled();
  });
});
