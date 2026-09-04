import { expect } from "vitest";
import type { createTestApp } from "./crm.controller.testSupport.js";

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
