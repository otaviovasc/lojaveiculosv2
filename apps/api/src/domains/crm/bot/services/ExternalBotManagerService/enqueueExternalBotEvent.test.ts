import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../../shared/serviceContext.js";
import { createMemoryExternalBotManager } from "../../testSupportExternalBotManager.js";
import { enqueueExternalBotEvent } from "./enqueueExternalBotEvent.js";

describe("enqueueExternalBotEvent", () => {
  it("durably queues a minimal event projection and scoped grant", async () => {
    const manager = createMemoryExternalBotManager();
    const event = await enqueueExternalBotEvent(
      context(),
      {
        actionClass: "proposal",
        allowedAction: "fact.propose",
        authorizedCommand: {
          action: "fact.propose",
          payload: {
            classification: "purchase_intent",
            summary: "Interested.",
          },
        },
        connectionId: "connection-1",
        expectedRevision: 1,
        idempotencyKey: "event-action-1",
        integrationId: "integration-1",
        modelVersion: "model-v1",
        payload: {
          channel: "olx_chat",
          classification: "new_message",
          messageRef: "opaque-message-1",
          summary: "Customer asked about availability.",
        },
        provider: "olx",
        threadId: "thread-1",
        type: "message_received",
      },
      manager.ports,
    );
    expect(event).toMatchObject({ actionClass: "proposal", provider: "olx" });
    expect(manager.events).toHaveLength(1);
    expect(event.payload).not.toHaveProperty("messageText");
  });
});

function context() {
  return createServiceContext({
    actor: { id: "store-user", kind: "user" },
    permissions: ["crm.bot.events.publish"],
    request: { requestId: "request-1" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}
