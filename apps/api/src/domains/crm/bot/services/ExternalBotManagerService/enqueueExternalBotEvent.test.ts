import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../../shared/serviceContext.js";
import { createMemoryExternalBotManager } from "../../testSupportExternalBotManager.js";
import { enqueueExternalBotEvent } from "./enqueueExternalBotEvent.js";

describe("enqueueExternalBotEvent", () => {
  it("durably queues a minimal event projection and scoped grant", async () => {
    const manager = createMemoryExternalBotManager({ policyMode: "proposal" });
    const event = await enqueueExternalBotEvent(
      context(),
      {
        channel: "olx_chat",
        allowedAction: "fact.record",
        authorizedCommand: {
          action: "fact.record",
          payload: {
            classification: "purchase_intent",
            summary: "Interested.",
          },
        },
        connectionId: "connection-1",
        expectedAttendanceRevision: 2,
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

  it("grants a bounded message.send_text capability with digest reconstruction fields", async () => {
    const manager = createMemoryExternalBotManager();
    const event = await enqueueExternalBotEvent(
      context(),
      {
        channel: "whatsapp",
        allowedAction: "message.send_text",
        authorizedCommand: {
          action: "message.send_text",
          payload: { text: "Reply composed by the bot." },
        },
        connectionId: "connection-1",
        expectedAttendanceRevision: 2,
        expectedRevision: 1,
        idempotencyKey: "crm-bot-event:message_received:cycle-1:1",
        integrationId: "integration-1",
        modelVersion: "model-v1",
        payload: {
          channel: "whatsapp",
          classification: "message_activity",
          direction: "inbound",
          messageRef: "opaque-message-1",
        },
        provider: "zapi",
        threadId: "thread-1",
        type: "message_received",
      },
      manager.ports,
    );
    expect(event).toMatchObject({ actionClass: "effect", provider: "zapi" });
    expect(event.grant).toBeTypeOf("string");
    expect(event.payload).toMatchObject({
      action: "message.send_text",
      channel: "whatsapp",
      expectedAttendanceRevision: 2,
      expectedRevision: 1,
      idempotencyKey: "crm-bot-event:message_received:cycle-1:1",
    });
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
