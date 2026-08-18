import { describe, expect, it } from "vitest";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp integrations", () => {
  it("returns an unconfigured bot integration without secrets", async () => {
    const app = createTestApp();
    const response = await app.request("/api/v1/crm/bot/configuration");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      configuration: {
        enabled: false,
        secretConfigured: false,
        webhookUrl: null,
      },
    });
  });

  it("saves bot webhook settings without returning the secret or hash", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({ audit });
    const response = await app.request("/api/v1/crm/bot/configuration", {
      body: JSON.stringify({
        enabled: true,
        webhookSecret: "bot-webhook-secret-value-32-characters",
        webhookUrl: "https://bot.example.test/webhook",
      }),
      method: "PATCH",
    });

    const body = (await response.json()) as {
      configuration: Record<string, unknown>;
    };
    expect(response.status).toBe(200);
    expect(body.configuration).toMatchObject({
      enabled: true,
      secretConfigured: true,
      webhookUrl: "https://bot.example.test/webhook",
    });
    expect(body.configuration.webhookSecret).toBeUndefined();
    expect(body.configuration.webhookSecretHash).toBeUndefined();
    expect(JSON.stringify(record.mock.calls)).not.toContain(
      "bot-webhook-secret-value-32-characters",
    );
  });

  it("does not enable bot forwarding until URL and secret are configured", async () => {
    const app = createTestApp();
    const response = await app.request("/api/v1/crm/bot/configuration", {
      body: JSON.stringify({ enabled: true }),
      method: "PATCH",
    });

    expect(response.status).toBe(422);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_INTEGRATION_INCOMPLETE",
      message:
        "Bot integration requires a webhook URL and secret before enabling.",
    });
  });

  it("requires the integrations manage permission", async () => {
    const app = createTestApp({ permissions: ["crm.whatsapp.read"] });
    const response = await app.request("/api/v1/crm/bot/configuration");

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message:
        "Missing one of required permissions: crm.bot.read, crm.bot.manage, crm.whatsapp.integrations.manage",
    });
  });

  it.each([
    "/api/v1/crm/whatsapp/integrations/bot/actions",
    "/api/v1/crm/bot/events",
  ])("does not register obsolete bot endpoint %s", async (path) => {
    const app = createTestApp();
    const response = await app.request(path, {
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(404);
  });

  it("keeps the canonical bot actions endpoint registered", async () => {
    const response = await createTestApp().request("/api/v1/crm/bot/actions", {
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).not.toBe(404);
  });
});
