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

  it("upserts the same intervention when a human answers an AI pause", async () => {
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const app = createTestApp({
      crmBotWebhookDispatcher: createBotDispatcher(dispatched),
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: { sendText: createSendTextSpy() },
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });
    await configureBot(app);
    const inboundResponse = await postZapiWebhook(app, {
      messageId: "zapi-waiting-human",
    });
    const inbound = (await inboundResponse.json()) as {
      session: { id: string };
    };
    const interventionId = "00000000-0000-4000-8000-000000000901";

    const pauseResponse = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "set_intervention",
          payload: {
            enabled: true,
            interventionId,
            reason: "KEYWORD_TRIGGER",
            source: "bot",
          },
          sessionId: inbound.session.id,
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );
    expect(pauseResponse.status).toBe(200);
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "intervention_started",
      intervention: {
        attendanceState: "WAITING_HUMAN",
        id: interventionId,
        stateVersion: 1,
        triggeredBy: "bot",
      },
      session: {
        humanAttendanceState: "WAITING_HUMAN",
        interventionId,
      },
    });

    const reactionResponse = await postZapiWebhook(app, {
      fromMe: true,
      messageId: "zapi-human-reaction",
      reaction: { messageId: "zapi-waiting-human", value: "👍" },
      text: undefined,
    });
    expect(reactionResponse.status).toBe(201);
    const waitingResponse = await app.request(
      `/api/v1/crm/whatsapp/sessions?sessionId=${inbound.session.id}`,
    );
    await expect(waitingResponse.json()).resolves.toMatchObject([
      {
        humanAttendanceState: "WAITING_HUMAN",
        humanAttendanceStateVersion: 1,
        interventionId,
      },
    ]);

    const answerResponse = await app.request(
      "/api/v1/crm/whatsapp/send/text",
      jsonRequest({
        sessionId: inbound.session.id,
        text: "Assumi o atendimento.",
      }),
    );
    expect(answerResponse.status).toBe(201);
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "intervention_started",
      intervention: {
        attendanceState: "IN_HUMAN_SERVICE",
        id: interventionId,
        stateVersion: 2,
        triggeredBy: "admin",
      },
      session: {
        humanAttendanceState: "IN_HUMAN_SERVICE",
        humanAttendanceStateVersion: 2,
        interventionId,
      },
    });

    const endResponse = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "set_intervention",
          payload: { enabled: false, interventionId },
          sessionId: inbound.session.id,
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );
    expect(endResponse.status).toBe(200);
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "intervention_ended",
      intervention: {
        attendanceState: null,
        id: interventionId,
        stateVersion: 3,
      },
      session: {
        humanAttendanceState: null,
        humanAttendanceStateVersion: 3,
        interventionId: null,
      },
    });
  });
});
