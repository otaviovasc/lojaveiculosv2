import { describe, expect, it } from "vitest";
import type { DispatchCrmBotWebhookInput } from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  configureBot,
  createBotDispatcher,
  createSendTextSpy,
  createZapiConnection,
  jsonRequest,
  postZapiWebhook,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp human attendance", () => {
  it("correlates a ZAPI echo that arrives before the CRM outbound insert", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: { sendText: createSendTextSpy() },
      crmWhatsappRepository: whatsappRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-origin-race-inbound",
    });
    const inbound = (await inboundResponse.json()) as {
      session: { id: string };
    };
    const echoResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "zapi-outbound-1",
      text: { message: "Resposta do CRM" },
    });
    expect(echoResponse.status).toBe(201);

    const sentResponse = await app.request(
      "/api/v1/crm/whatsapp/send/text",
      jsonRequest({
        sessionId: inbound.session.id,
        text: "Resposta do CRM",
      }),
    );
    expect(sentResponse.status).toBe(201);
    await expect(sentResponse.json()).resolves.toMatchObject({
      externalId: "zapi-outbound-1",
      senderOrigin: "human_crm",
      senderType: "HUMAN",
    });
    const messages = await whatsappRepository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: inbound.session.id,
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
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmBotWebhookDispatcher: createBotDispatcher(dispatched),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: { sendText: createSendTextSpy() },
      crmWhatsappRepository: whatsappRepository,
    });
    await configureBot(app);
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-before-provider-echo",
    });
    const inbound = (await inboundResponse.json()) as {
      session: { id: string; revision: number };
    };

    const echoResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "zapi-provider-only-echo",
      text: { message: "Mensagem enviada fora do CRM" },
    });
    const echo = (await echoResponse.json()) as {
      message: { senderOrigin: string; senderType: string };
      session: {
        assignedUserId: string | null;
        humanAttendanceState: string | null;
        revision: number;
        status: string;
      };
    };

    expect(echoResponse.status).toBe(201);
    expect(echo.message).toMatchObject({
      senderOrigin: "human_whatsapp",
      senderType: "HUMAN",
    });
    expect(echo.session).toMatchObject({
      assignedUserId: null,
      humanAttendanceState: "IN_HUMAN_SERVICE",
      revision: inbound.session.revision + 2,
      status: "HUMAN_TAKEOVER",
    });
    expect(
      dispatched.some((item) => item.payload.event === "intervention_started"),
    ).toBe(true);
  });

  it("keeps reactions outside human attendance", async () => {
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmBotWebhookDispatcher: createBotDispatcher(dispatched),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });
    await configureBot(app);
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-before-reaction-only",
    });
    const inbound = (await inboundResponse.json()) as {
      session: { id: string; revision: number };
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
      session: {
        humanAttendanceState: string | null;
        revision: number;
        status: string;
      };
    };

    expect(reaction.message).toMatchObject({
      senderOrigin: "unknown",
      senderType: "SYSTEM",
    });
    expect(reaction.session).toMatchObject({
      humanAttendanceState: null,
      revision: inbound.session.revision + 1,
      status: "ACTIVE",
    });
    expect(
      dispatched.some((item) => item.payload.event === "intervention_started"),
    ).toBe(false);
  });

  it("keeps the lead name when a direct WhatsApp echo carries a LID chat name", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappRepository: whatsappRepository,
    });

    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-tom-inbound",
      senderName: "Tom",
      text: { message: "Quero conhecer a ferramenta" },
    });
    const inbound = (await inboundResponse.json()) as {
      session: { id: string };
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
        senderOrigin: "human_whatsapp",
        senderType: "HUMAN",
      },
      session: {
        buyerName: "Tom",
        id: inbound.session.id,
      },
    });
  });

  it("keeps an active conversation active when a seller only reacts", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: { sendText: createSendTextSpy() },
      crmWhatsappRepository: whatsappRepository,
    });
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-active-before-reaction",
    });
    const inbound = (await inboundResponse.json()) as {
      session: { id: string };
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
    const [session] = await whatsappRepository.listSessions({
      limit: 1,
      offset: 0,
      sessionId: inbound.session.id,
      storeId: createZapiConnection().storeId,
      tenantId: createZapiConnection().tenantId,
    });
    expect(session).toMatchObject({
      firstHandledAt: null,
      humanAttendanceState: null,
      status: "ACTIVE",
    });
  });
});
