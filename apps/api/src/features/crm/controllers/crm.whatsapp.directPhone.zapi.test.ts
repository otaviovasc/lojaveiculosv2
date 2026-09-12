import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { withTestZapiWebhookToken } from "./crm.channelConnections.testSupport.js";
import {
  createZapiConnection,
  jsonRequest,
  postZapiWebhook,
} from "./crm.messaging.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";

function postOwnerMessage(
  app: ReturnType<typeof createTestApp>,
  overrides: Record<string, unknown>,
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    jsonRequest(
      {
        fromMe: true,
        messageId: "zapi-direct-owner-1",
        momment: 1783029600000,
        phone: "5511999999999",
        senderName: "Ana",
        text: { message: "Resposta direta do zap" },
        type: "Received",
        ...overrides,
      },
      withTestZapiWebhookToken(),
    ),
  );
}

describe("CRM WhatsApp ZAPI direct-phone messages", () => {
  it("stores a message the owner sent directly from WhatsApp", async () => {
    const connection = createZapiConnection();
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        connection,
      ]),
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-direct-inbound",
    });
    expect(inboundResponse.status).toBe(201);
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };

    const directResponse = await postOwnerMessage(app, {});
    expect(directResponse.status).toBe(201);
    await expect(directResponse.json()).resolves.toMatchObject({
      message: {
        direction: "OUTBOUND",
        externalId: "zapi-direct-owner-1",
        senderOrigin: "human_channel",
        senderType: "HUMAN",
      },
      status: "stored",
    });

    const messages = await conversationRepository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    expect(
      messages.some((message) => message.externalId === "zapi-direct-owner-1"),
    ).toBe(true);
  });

  it("keeps a LID-only direct-phone message in the customer thread", async () => {
    const connection = createZapiConnection();
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        connection,
      ]),
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      chatLid: "223344556677889@lid",
      messageId: "zapi-lid-inbound",
      phone: "223344556677889@lid",
      senderName: "Ana",
      text: { message: "Ola pelo lid" },
    });
    expect(inboundResponse.status).toBe(201);
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };

    // connectedPhone identifies the seller account and must never become the
    // customer identity for fromMe payloads.
    const directResponse = await postOwnerMessage(app, {
      chatLid: "223344556677889@lid",
      connectedPhone: "5511990000000",
      messageId: "zapi-lid-owner-1",
      phone: "223344556677889@lid",
      text: { message: "Resposta direta no chat lid" },
    });
    expect(directResponse.status).toBe(201);
    const direct = (await directResponse.json()) as {
      conversationCycle: { id: string };
    };
    expect(direct.conversationCycle.id).toBe(inbound.conversationCycle.id);

    const messages = await conversationRepository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    expect(
      messages.some((message) => message.externalId === "zapi-lid-owner-1"),
    ).toBe(true);
  });
});
