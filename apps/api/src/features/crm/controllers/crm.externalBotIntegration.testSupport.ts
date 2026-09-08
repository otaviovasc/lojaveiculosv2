import { expect } from "vitest";
import { createMemoryExternalBotManager } from "../../../domains/crm/bot/testSupportExternalBotManager.js";
import type { CrmExternalBotIntegrationRepository } from "../../../domains/crm/ports/crmExternalBotIntegrationRepository.js";
import type { createTestApp } from "./crm.controller.testSupport.js";

export function createRepositoryBoundExternalBotManager(
  repository: CrmExternalBotIntegrationRepository,
) {
  const manager = createMemoryExternalBotManager();
  manager.ports.actionAuthenticator = {
    authenticate: async (credential) => {
      const integration =
        await repository.findExternalBotIntegrationByApiTokenHash({
          apiTokenHash: manager.ports.digest.digest(credential),
        });
      if (!integration?.id) return null;
      return {
        integrationId: integration.id,
        storeId: integration.storeId,
        tenantId: integration.tenantId,
      };
    },
  };
  return manager;
}

export async function configureBot(app: ReturnType<typeof createTestApp>) {
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
}

export function jsonPost(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method,
  };
}
