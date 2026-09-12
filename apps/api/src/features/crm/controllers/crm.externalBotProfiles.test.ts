import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmExternalBotProfileRepository } from "../adapters/memory/crmExternalBotProfileRepository.js";
import {
  createAuditSpy,
  createTestApp,
  expectApiError,
} from "./crm.controller.testSupport.js";

const apiToken = "bot-actions-api-token-with-32-characters";
const webhookSecret = "bot-webhook-secret-value-32-characters";

describe("CRM external bot profiles", () => {
  it("lists no profiles before setup without exposing credentials", async () => {
    const response = await createTestApp().request("/api/v1/crm/bot/profiles");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ profiles: [] });
  });

  it("creates a profile without returning credential values", async () => {
    const { audit, record } = createAuditSpy();
    const repository = createMemoryCrmExternalBotProfileRepository();
    const create = vi.spyOn(repository, "createProfile");
    const app = createTestApp({
      audit,
      crmExternalBotProfileRepository: repository,
    });

    const response = await app.request("/api/v1/crm/bot/profiles", {
      body: JSON.stringify({
        apiToken,
        enabled: true,
        name: "Bot principal",
        webhookSecret,
        webhookUrl: "https://bot.example.test/webhook",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(201);
    expect(body).not.toHaveProperty("apiToken");
    expect(body).not.toHaveProperty("webhookSecret");
    expect(JSON.stringify(record.mock.calls)).not.toContain(apiToken);
    expect(JSON.stringify(record.mock.calls)).not.toContain(webhookSecret);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        apiTokenHash: createHash("sha256").update(apiToken).digest("hex"),
      }),
    );
  });

  it("requires URL and HMAC secret before enabling a profile", async () => {
    const response = await createTestApp().request("/api/v1/crm/bot/profiles", {
      body: JSON.stringify({ enabled: true, name: "Incomplete bot" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(422);
    await expectApiError(response, {
      code: "CRM_EXTERNAL_BOT_PROFILE_INCOMPLETE",
      message: "Bot profile requires a webhook URL and secret before enabling.",
    });
  });

  it("rejects profile management without bot permissions", async () => {
    const response = await createTestApp({
      permissions: ["crm.conversations.read"],
    }).request("/api/v1/crm/bot/profiles");

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "AUTHORIZATION_DENIED",
      message:
        "Missing one of required permissions: crm.bot.read, crm.bot.manage",
    });
  });

  it("updates credentials as write-only replacements", async () => {
    const app = createTestApp();
    const created = await app.request("/api/v1/crm/bot/profiles", {
      body: JSON.stringify({
        apiToken,
        name: "Bot principal",
        webhookSecret,
        webhookUrl: "https://bot.example.test/webhook",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const profile = (await created.json()) as { id: string };

    const response = await app.request(
      `/api/v1/crm/bot/profiles/${profile.id}`,
      {
        body: JSON.stringify({ webhookSecret: `${webhookSecret}-rotated` }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("webhookSecret");
    expect(body).not.toHaveProperty("webhookSecretHash");
  });

  it("does not register the removed configuration endpoint", async () => {
    const response = await createTestApp().request(
      "/api/v1/crm/bot/configuration",
    );

    expect(response.status).toBe(404);
  });
});
