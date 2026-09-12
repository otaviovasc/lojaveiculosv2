import { expect } from "vitest";
import { createMemoryExternalBotManager } from "../../../domains/crm/bot/testSupportExternalBotManager.js";
import type { CrmExternalBotProfileRepository } from "../../../domains/crm/ports/crmExternalBotProfileRepository.js";
import type { createTestApp } from "./crm.controller.testSupport.js";

export function createRepositoryBoundExternalBotManager(
  repository: CrmExternalBotProfileRepository,
) {
  const manager = createMemoryExternalBotManager();
  manager.ports.actionAuthenticator = {
    authenticate: async (credential) => {
      const profile = await repository.findProfileByApiTokenHash({
        apiTokenHash: manager.ports.digest.digest(credential),
      });
      if (!profile?.id) return null;
      return {
        integrationId: profile.id,
        profileId: profile.id,
        storeId: profile.storeId,
        tenantId: profile.tenantId,
      };
    },
  };
  return manager;
}

export async function configureBot(app: ReturnType<typeof createTestApp>) {
  const response = await app.request(
    "/api/v1/crm/bot/profiles",
    jsonPost(
      {
        apiToken: "bot-actions-api-token-with-32-characters",
        enabled: true,
        name: "Bot de teste",
        webhookSecret: "bot-webhook-secret-value-32-characters",
        webhookUrl: "https://bot.example.test/webhook",
      },
      undefined,
    ),
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string };
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
