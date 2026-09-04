import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createTestApp, expectApiError } from "./crm.controller.testSupport.js";
import { jsonPost } from "./crm.externalBotIntegration.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM external bot integration security", () => {
  it("seals the delivery secret before repository persistence", async () => {
    const repository = createMemoryCrmExternalBotIntegrationRepository();
    const upsert = vi.spyOn(repository, "upsertExternalBotIntegration");
    const seal = vi.fn(async () => "sealed:bot-webhook-ciphertext");
    const app = createTestApp({
      crmExternalBotIntegrationRepository: repository,
      crmConnectionCredentialVault: {
        open: async ({ sealed }) => sealed,
        seal,
      },
    });

    const response = await app.request(
      "/api/v1/crm/bot/configuration",
      jsonPost(
        {
          enabled: true,
          webhookSecret: "bot-webhook-secret-value-32-characters",
          webhookUrl: "https://bot.example.test/webhook",
        },
        undefined,
        "PATCH",
      ),
    );

    expect(response.status).toBe(200);
    expect(seal).toHaveBeenCalledWith(
      expect.objectContaining({
        plaintext: "bot-webhook-secret-value-32-characters",
        purpose: "crm-bot.webhook-secret",
        storeId,
        tenantId,
      }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookSecretSealed: "sealed:bot-webhook-ciphertext",
      }),
    );
    expect(JSON.stringify(upsert.mock.calls)).not.toContain(
      '"webhookSecretValue"',
    );
  });

  it.each([
    "http://bot.example.com/webhook",
    "https://user:password@bot.example.com/webhook",
    "https://localhost/webhook",
    "https://127.0.0.1/webhook",
    "https://[::1]/webhook",
  ])("rejects an unsafe webhook URL: %s", async (webhookUrl) => {
    const app = createTestApp();
    const response = await app.request(
      "/api/v1/crm/bot/configuration",
      jsonPost({ webhookUrl }, undefined, "PATCH"),
    );

    expect(response.status).toBe(400);
    await expectApiError(response, {
      code: "CRM_EXTERNAL_BOT_INTEGRATION_INVALID",
      message:
        "Webhook URL must use public HTTPS without embedded credentials.",
    });
  });

  it("rejects webhook secrets shorter than the prelaunch minimum", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/v1/crm/bot/configuration",
      jsonPost({ webhookSecret: "short-webhook-secret" }, undefined, "PATCH"),
    );

    expect(response.status).toBe(400);
    await expectApiError(response, {
      code: "CRM_MESSAGING_VALIDATION_ERROR",
      message: "Request body is invalid.",
    });
  });
});
