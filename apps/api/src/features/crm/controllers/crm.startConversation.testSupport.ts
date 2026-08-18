import type { createTestApp } from "./crm.controller.testSupport.js";

export function requestStartConversation(
  app: ReturnType<typeof createTestApp>,
  body: Record<string, unknown>,
) {
  return app.request("/api/v1/crm/conversation-cycles", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
