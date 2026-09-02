import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createZapiConnection,
  postZapiWebhook,
} from "./crm.messaging.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { jsonPost } from "./crm.conversationCycleActions.testSupport.js";

type ReactionMessage = {
  metadata?: {
    interactive?: { kind?: string; unresolved?: boolean };
    reaction?: { origin?: string; value?: string };
  };
  type?: string;
};

function setup() {
  const conversationRepository = createMemoryCrmConversationRepository();
  const app = createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]),
    crmConversationRepository: conversationRepository,
  });
  return { app, conversationRepository };
}

describe("CRM inbound WhatsApp reactions", () => {
  it("attaches reactions to messages in archived or deleted cycles", async () => {
    const { app } = setup();
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-reaction-archived-target",
    });
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };
    const cyclePath = `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}`;

    const archived = await app.request(
      `${cyclePath}/actions/archive`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000030" }),
    );
    expect(archived.status).toBe(200);

    const archivedReactionResponse = await postZapiWebhook(app, {
      messageId: "zapi-reaction-on-archived",
      reaction: { messageId: "zapi-reaction-archived-target", value: "❤️" },
      text: undefined,
      timestamp: 1783018900,
    });
    expect(archivedReactionResponse.status).toBe(201);
    const archivedReaction = (await archivedReactionResponse.json()) as {
      message: ReactionMessage;
    };
    expect(archivedReaction.message).toMatchObject({
      metadata: { reaction: { origin: "inbound", value: "❤️" } },
    });

    const deleted = await app.request(
      `${cyclePath}/actions/delete`,
      jsonPost({ commandId: "10000000-0000-4000-8000-000000000031" }),
    );
    expect(deleted.status).toBe(200);

    const deletedReactionResponse = await postZapiWebhook(app, {
      messageId: "zapi-reaction-on-deleted",
      reaction: { messageId: "zapi-reaction-archived-target", value: "👍" },
      text: undefined,
      timestamp: 1783019000,
    });
    expect(deletedReactionResponse.status).toBe(201);
    const deletedReaction = (await deletedReactionResponse.json()) as {
      message: ReactionMessage;
    };
    expect(deletedReaction.message).toMatchObject({
      metadata: { reaction: { origin: "inbound", value: "👍" } },
    });
  });

  it("applies the recency guard to un-react events", async () => {
    const { app } = setup();
    await postZapiWebhook(app, {
      messageId: "zapi-unreact-target",
      timestamp: 1783018800,
    });

    const reactResponse = await postZapiWebhook(app, {
      messageId: "zapi-unreact-set",
      reaction: { messageId: "zapi-unreact-target", value: "👍" },
      text: undefined,
      timestamp: 1783019000,
    });
    expect(reactResponse.status).toBe(201);

    // A stale un-react (older than the stored reaction) must not remove it.
    const staleUnreactResponse = await postZapiWebhook(app, {
      messageId: "zapi-unreact-stale",
      reaction: { messageId: "zapi-unreact-target", value: "" },
      text: undefined,
      timestamp: 1783018900,
    });
    expect(staleUnreactResponse.status).toBe(201);
    const staleUnreact = (await staleUnreactResponse.json()) as {
      message: ReactionMessage;
    };
    expect(staleUnreact.message.metadata?.reaction).toMatchObject({
      value: "👍",
    });

    // A newer un-react removes the pill.
    const freshUnreactResponse = await postZapiWebhook(app, {
      messageId: "zapi-unreact-fresh",
      reaction: { messageId: "zapi-unreact-target", value: "" },
      text: undefined,
      timestamp: 1783019100,
    });
    expect(freshUnreactResponse.status).toBe(201);
    const freshUnreact = (await freshUnreactResponse.json()) as {
      message: ReactionMessage;
    };
    expect(freshUnreact.message.metadata?.reaction).toBeUndefined();
  });

  it("stamps standalone fallback reactions as unresolved", async () => {
    const { app } = setup();
    await postZapiWebhook(app, { messageId: "zapi-unrelated-inbound" });

    const fallbackResponse = await postZapiWebhook(app, {
      messageId: "zapi-reaction-unknown-target",
      reaction: { messageId: "zapi-not-synced-yet", value: "😂" },
      text: undefined,
      timestamp: 1783018900,
    });
    expect(fallbackResponse.status).toBe(201);
    const fallback = (await fallbackResponse.json()) as {
      message: ReactionMessage;
      status: string;
    };
    expect(fallback.status).toBe("stored");
    expect(fallback.message).toMatchObject({
      metadata: {
        interactive: { kind: "reaction", unresolved: true },
      },
      type: "INTERACTIVE",
    });
  });
});
