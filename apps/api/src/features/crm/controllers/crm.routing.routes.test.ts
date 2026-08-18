import { describe, expect, it } from "vitest";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM routing policy routes", () => {
  it("returns all channel policies with explicit blocked states", async () => {
    const response = await createTestApp().request(
      "/api/v1/crm/routing-policy",
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      channels: Array<{
        bot: { blocked: { code: string } };
        externalBot: { blocked: { code: string } };
        storeDefault: { blocked: { code: string } };
      }>;
    };
    expect(body.channels).toHaveLength(3);
    expect(body.channels[0]?.storeDefault.blocked.code).toBe(
      "policy_not_configured",
    );
    expect(body.channels[0]?.externalBot.blocked.code).toBe("route_disabled");
  });

  it("updates a disabled channel policy without touching persisted messages", async () => {
    const response = await createTestApp().request(
      "/api/v1/crm/routing-policy",
      {
        body: JSON.stringify({
          externalBotMode: "disabled",
          externalBotConnectionId: null,
          channel: "instagram",
          defaultConnectionId: null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { channels: unknown[] };
    expect(body.channels).toHaveLength(3);
  });

  it("rejects malformed explicit bot routes", async () => {
    const response = await createTestApp().request(
      "/api/v1/crm/routing-policy",
      {
        body: JSON.stringify({
          externalBotMode: "explicit_connection",
          channel: "whatsapp",
          defaultConnectionId: null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "CRM_MESSAGING_VALIDATION_ERROR",
    });
  });
});
