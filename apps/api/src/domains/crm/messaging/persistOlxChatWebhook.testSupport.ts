import { createServiceContext } from "../../../shared/serviceContext.js";

export function createOlxChatWebhookTestContext() {
  return createServiceContext({
    actor: { id: "olx", kind: "integration" },
    permissions: ["crm.messages.ingest"],
    request: { requestId: "request-olx" },
    source: { component: "test", service: "api" },
  });
}
