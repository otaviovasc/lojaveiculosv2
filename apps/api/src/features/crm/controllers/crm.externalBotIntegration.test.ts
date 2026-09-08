import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.controller.testSupport.js";

describe("CRM external bot integration", () => {
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
      code: "CRM_EXTERNAL_BOT_INTEGRATION_INCOMPLETE",
      message:
        "Bot integration requires a webhook URL and secret before enabling.",
    });
  });

  it("requires the integrations manage permission", async () => {
    const app = createTestApp({ permissions: ["crm.conversations.read"] });
    const response = await app.request("/api/v1/crm/bot/configuration");

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message: "Missing permission: crm.bot.read",
    });
  });

  it("does not register the obsolete bot events endpoint", async () => {
    const app = createTestApp();
    const response = await app.request("/api/v1/crm/bot/events", {
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

  it("configures the actions API token without returning it", async () => {
    const { audit, record } = createAuditSpy();
    const repository = createMemoryCrmExternalBotIntegrationRepository();
    const upsert = vi.spyOn(repository, "upsertExternalBotIntegration");
    const app = createTestApp({
      audit,
      crmExternalBotIntegrationRepository: repository,
    });
    const apiToken = "bot-actions-api-token-with-32-characters";

    const response = await app.request("/api/v1/crm/bot/configuration", {
      body: JSON.stringify({ apiToken }),
      method: "PATCH",
    });

    const body = (await response.json()) as {
      configuration: Record<string, unknown>;
    };
    expect(response.status).toBe(200);
    expect(body.configuration.apiTokenConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain(apiToken);
    expect(JSON.stringify(record.mock.calls)).not.toContain(apiToken);
    // The stored hash must be exactly what the actions authenticator compares.
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        apiTokenHash: createHash("sha256").update(apiToken).digest("hex"),
      }),
    );

    const read = await app.request("/api/v1/crm/bot/configuration");
    await expect(read.json()).resolves.toMatchObject({
      configuration: { apiTokenConfigured: true },
    });
  });

  it("clears the actions API token and audits the rotation", async () => {
    const { audit, record } = createAuditSpy();
    const app = createTestApp({
      audit,
      crmExternalBotIntegrationRepository:
        createMemoryCrmExternalBotIntegrationRepository(),
    });

    await app.request("/api/v1/crm/bot/configuration", {
      body: JSON.stringify({
        apiToken: "bot-actions-api-token-with-32-characters",
      }),
      method: "PATCH",
    });
    const response = await app.request("/api/v1/crm/bot/configuration", {
      body: JSON.stringify({ apiToken: null }),
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      configuration: { apiTokenConfigured: false },
    });
    const auditPayloads = JSON.stringify(record.mock.calls);
    expect(auditPayloads).toContain('"apiTokenChanged":true');
    expect(auditPayloads).toContain('"apiTokenCleared":true');
    expect(auditPayloads).not.toContain(
      "bot-actions-api-token-with-32-characters",
    );
  });

  it("rejects actions API tokens shorter than the minimum", async () => {
    const app = createTestApp();
    const response = await app.request("/api/v1/crm/bot/configuration", {
      body: JSON.stringify({ apiToken: "short-token" }),
      method: "PATCH",
    });

    expect(response.status).toBe(400);
    await expectApiError(response, {
      code: "CRM_MESSAGING_VALIDATION_ERROR",
      message: "Request body is invalid.",
    });
  });
});
