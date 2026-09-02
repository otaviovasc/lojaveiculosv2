import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  createMediaTestZapiConnection,
  createTestObjectStorage,
  mediaTestConnectionId,
  seedMediaConversationCycle,
} from "./crm.messages.sendMedia.testSupport.js";

describe("CRM conversation media message replies", () => {
  it("forwards the reply target to the provider media payload", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const inbound = await seedMediaConversationCycle(
      conversationRepository,
      "reply",
    );
    const sendMedia = vi.fn(async () => ({
      externalId: "zapi-image-reply-1",
      providerTimestamp: new Date("2026-07-02T19:03:00.000Z"),
    }));
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createMediaTestZapiConnection(),
      ]),
      crmMessagingGateway: {
        getConnectionStatus: vi.fn(),
        sendMedia,
        sendText: vi.fn(),
      },
      crmMediaStorage: createTestObjectStorage().storage,
      crmConversationRepository: conversationRepository,
    });

    const response = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages/media`,
      {
        body: JSON.stringify({
          base64: Buffer.from("image-bytes").toString("base64"),
          fileName: "civic.jpg",
          mediaType: "image",
          mimeType: "image/jpeg",
          replyToMessageId: inbound.message.id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      metadata: {
        replyTo: {
          externalId: "inbound-media-send-reply",
          id: inbound.message.id,
        },
      },
    });
    expect(sendMedia).toHaveBeenCalledWith(
      expect.objectContaining({ id: mediaTestConnectionId }),
      expect.objectContaining({
        replyToMessageId: "inbound-media-send-reply",
      }),
    );
  });
});
