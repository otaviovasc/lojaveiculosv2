import { describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import {
  createSendTextSpy,
  createZapiConnection,
  jsonRequest,
  postZapiWebhook,
} from "./crm.messaging.testSupport.js";
import { createTestApp } from "./crm.controller.testSupport.js";

describe("CRM human attendance", () => {
  it("correlates a ZAPI echo that arrives before the CRM outbound insert", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: { sendText: createSendTextSpy() },
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-origin-race-inbound",
    });
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };
    const echoResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "zapi-outbound-1",
      text: { message: "Resposta do CRM" },
    });
    expect(echoResponse.status).toBe(201);

    const sentResponse = await app.request(
      `/api/v1/crm/conversation-cycles/${inbound.conversationCycle.id}/messages`,
      jsonRequest({
        content: "Resposta do CRM",
      }),
    );
    expect(sentResponse.status).toBe(201);
    await expect(sentResponse.json()).resolves.toMatchObject({
      externalId: "zapi-outbound-1",
      senderOrigin: "human_crm",
      senderType: "HUMAN",
    });
    const messages = await conversationRepository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId: createZapiConnection().storeId,
      tenantId: createZapiConnection().tenantId,
    });
    expect(
      messages.filter((message) => message.externalId === "zapi-outbound-1"),
    ).toEqual([
      expect.objectContaining({
        senderOrigin: "human_crm",
        senderType: "HUMAN",
      }),
    ]);
  });

  it("classifies direct WhatsApp messages as human attendance", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: { sendText: createSendTextSpy() },
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-before-provider-echo",
    });
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string; revision: number };
    };

    const echoResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "zapi-provider-only-echo",
      text: { message: "Mensagem enviada fora do CRM" },
    });
    const echo = (await echoResponse.json()) as {
      message: { senderOrigin: string; senderType: string };
      conversationCycle: {
        assignedUserId: string | null;
        humanAttendanceState: string | null;
        revision: number;
        status: string;
      };
    };

    expect(echoResponse.status).toBe(201);
    expect(echo.message).toMatchObject({
      senderOrigin: "human_channel",
      senderType: "HUMAN",
    });
    expect(echo.conversationCycle).toMatchObject({
      assignedUserId: null,
      humanAttendanceState: "IN_HUMAN_SERVICE",
      revision: inbound.conversationCycle.revision + 2,
      status: "HUMAN_TAKEOVER",
    });
  });

  it("keeps reactions outside human attendance", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-before-reaction-only",
    });
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string; revision: number };
    };

    const reactionResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "zapi-provider-reaction-only",
      reaction: {
        messageId: "zapi-before-reaction-only",
        value: "👍",
      },
      text: undefined,
    });
    const reaction = (await reactionResponse.json()) as {
      message: { senderOrigin: string; senderType: string };
      conversationCycle: {
        humanAttendanceState: string | null;
        revision: number;
        status: string;
      };
    };

    expect(reaction.message).toMatchObject({
      senderOrigin: "unknown",
      senderType: "SYSTEM",
    });
    expect(reaction.conversationCycle).toMatchObject({
      humanAttendanceState: null,
      revision: inbound.conversationCycle.revision + 1,
      status: "ACTIVE",
    });
  });

  it("keeps the lead name when a direct WhatsApp echo carries a LID chat name", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });

    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-tom-inbound",
      senderName: "Tom",
      text: { message: "Quero conhecer a ferramenta" },
    });
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };

    const directResponse = await postZapiWebhook(app, {
      chatName: "38272554291307@lid",
      fromMe: true,
      messageId: "zapi-tom-direct",
      text: { message: "Bom diaa!" },
    });
    expect(directResponse.status).toBe(201);
    await expect(directResponse.json()).resolves.toMatchObject({
      message: {
        senderOrigin: "human_channel",
        senderType: "HUMAN",
      },
      conversationCycle: {
        customerDisplayName: "Tom",
        id: inbound.conversationCycle.id,
      },
    });
  });

  it("keeps an active conversation active when a seller only reacts", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmMessagingGateway: { sendText: createSendTextSpy() },
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-active-before-reaction",
    });
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };

    const reactionResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "zapi-active-reaction",
      reaction: {
        messageId: "zapi-active-before-reaction",
        value: "👍",
      },
      text: undefined,
    });

    expect(reactionResponse.status).toBe(201);
    const [cycle] = await conversationRepository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId: createZapiConnection().storeId,
      tenantId: createZapiConnection().tenantId,
    });
    expect(cycle).toMatchObject({
      firstHandledAt: null,
      humanAttendanceState: null,
      status: "ACTIVE",
    });
  });
});
