import type { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

export function requestStartConversation(
  app: ReturnType<typeof createTestApp>,
  body: Record<string, unknown>,
) {
  return app.request("/api/v1/crm/whatsapp/conversations/start", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
