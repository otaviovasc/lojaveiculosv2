import { describe, expect, it } from "vitest";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp integrations", () => {
  it("returns an unconfigured bot integration without secrets", async () => {
    const app = createTestApp();
    const response = await app.request("/api/v1/crm/whatsapp/integrations/bot");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      integration: {
        enabled: false,
        secretConfigured: false,
        webhookUrl: null,
      },
    });
  });

  it("saves bot webhook settings without returning the secret or hash", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({ audit });
    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot",
      {
        body: JSON.stringify({
          enabled: true,
          webhookSecret: "bot-secret-value",
          webhookUrl: "https://bot.example.test/webhook",
        }),
        method: "PATCH",
      },
    );

    const body = (await response.json()) as {
      integration: Record<string, unknown>;
    };
    expect(response.status).toBe(200);
    expect(body.integration).toMatchObject({
      enabled: true,
      secretConfigured: true,
      webhookUrl: "https://bot.example.test/webhook",
    });
    expect(body.integration.webhookSecret).toBeUndefined();
    expect(body.integration.webhookSecretHash).toBeUndefined();
    expect(JSON.stringify(record.mock.calls)).not.toContain("bot-secret-value");
  });

  it("does not enable bot forwarding until URL and secret are configured", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot",
      {
        body: JSON.stringify({ enabled: true }),
        method: "PATCH",
      },
    );

    expect(response.status).toBe(422);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_INTEGRATION_INCOMPLETE",
      message:
        "Bot integration requires a webhook URL and secret before enabling.",
    });
  });

  it("requires the integrations manage permission", async () => {
    const app = createTestApp({ permissions: ["crm.whatsapp.read"] });
    const response = await app.request("/api/v1/crm/whatsapp/integrations/bot");

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.whatsapp.integrations.manage",
    });
  });
});
