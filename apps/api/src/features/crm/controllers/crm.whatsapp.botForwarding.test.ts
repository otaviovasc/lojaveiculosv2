import { describe, expect, it, vi } from "vitest";
import type { DispatchCrmBotWebhookInput } from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  configureBot,
  createBotDispatcher,
  connectionId,
  createSendTextSpy,
  createZapiConnection,
  jsonRequest,
  postZapiWebhook,
  requireDispatch,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import {
  createAuditSpy,
  createTestApp,
} from "./crm.whatsapp.controller.testSupport.js";

describe("CRM WhatsApp bot webhook forwarding", () => {
  it("mirrors Repasses inbound, outbound, and intervention events", async () => {
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const dispatcher = createBotDispatcher(dispatched);
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const { audit, record: recordAudit } = createAuditSpy();
    const sendText = createSendTextSpy();
    const app = createTestApp({
      audit,
      crmBotWebhookDispatcher: dispatcher,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
      logger,
    });

    await configureBot(app);
    const inboundResponse = await postZapiWebhook(app);
    const inbound = (await inboundResponse.json()) as {
      message: { id: string };
      session: { id: string; leadId: string };
    };

    expect(inboundResponse.status).toBe(201);
    expect(dispatched).toHaveLength(1);
    const firstDispatch = requireDispatch(dispatched, 0);
    expect(firstDispatch.idempotencyKey).toContain(inbound.message.id);
    expect(firstDispatch).toMatchObject({
      webhookSecret: "bot-secret-value",
      webhookUrl: "https://bot.example.test/webhook",
      payload: {
        actionsApi: { authentication: "X-Webhook-Secret" },
        connectionId,
        event: "message",
        message: {
          fromMe: false,
          id: inbound.message.id,
          providerMessageId: "zapi-inbound-forward-1",
          senderOrigin: "customer",
          uuid: inbound.message.id,
          wasSentByApi: false,
        },
        session: {
          id: inbound.session.id,
          isBotActive: true,
          leadId: inbound.session.leadId,
          uuid: inbound.session.id,
        },
      },
    });
    expect(JSON.stringify(firstDispatch.payload)).not.toContain(
      "bot-secret-value",
    );

    const humanResponse = await app.request(
      "/api/v1/crm/whatsapp/send/text",
      jsonRequest({
        sessionId: inbound.session.id,
        text: "Podemos falar por aqui.",
      }),
    );
    expect(humanResponse.status).toBe(201);
    await expect(humanResponse.clone().json()).resolves.toMatchObject({
      externalId: "zapi-outbound-1",
    });
    expect(logger.warn).not.toHaveBeenCalled();
    const startedPayload = dispatched.at(-1)?.payload;
    expect(startedPayload).toMatchObject({
      event: "intervention_started",
      intervention: {
        active: true,
        endedAt: null,
        messageCount: 0,
        reason: "human_outbound_message",
        summary: null,
        triggeredBy: "human",
      },
      session: { isBotActive: false, status: "HUMAN_TAKEOVER" },
    });
    expect(startedPayload?.intervention?.durationSeconds).toBeNull();
    expect(typeof startedPayload?.intervention?.startedAt).toBe("string");

    const pausedInbound = await postZapiWebhook(app, {
      messageId: "zapi-inbound-paused",
      text: { message: "Tem alguem ai?" },
      timestamp: 1783018920,
    });
    expect(pausedInbound.status).toBe(201);
    expect(dispatched).toHaveLength(2);

    const resumed = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "set_intervention",
          payload: { enabled: false },
          sessionId: inbound.session.id,
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );
    expect(resumed.status).toBe(200);
    const endedPayload = dispatched.at(-1)?.payload;
    expect(endedPayload).toMatchObject({
      event: "intervention_ended",
      intervention: {
        active: false,
        messageCount: 2,
        reason: "bot_action",
        triggeredBy: "bot",
      },
    });
    expect(typeof endedPayload?.intervention?.startedAt).toBe("string");
    expect(typeof endedPayload?.intervention?.endedAt).toBe("string");
    expect(typeof endedPayload?.intervention?.durationSeconds).toBe("number");
    expect(endedPayload?.intervention?.summary).toContain(
      "Staff: Podemos falar por aqui.",
    );
    expect(endedPayload?.intervention?.summary).toContain(
      "Customer: Tem alguem ai?",
    );

    const botSend = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "send_text",
          payload: { text: "Retomando o atendimento automatico." },
          sessionId: inbound.session.id,
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );
    expect(botSend.status).toBe(200);
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "message",
      message: {
        providerMessageId: "zapi-outbound-2",
        senderOrigin: "bot_api",
        wasSentByApi: true,
      },
    });
    const dispatchAudits = recordAudit.mock.calls
      .map(([event]) => event)
      .filter((event) => event.action === "crm.whatsapp.bot.webhook.dispatch");
    expect(dispatchAudits.length).toBeGreaterThanOrEqual(6);
    expect(dispatchAudits.map((event) => event.outcome)).toContain("attempted");
    expect(dispatchAudits.map((event) => event.outcome)).toContain("succeeded");
    expect(JSON.stringify(dispatchAudits)).not.toContain("bot-secret-value");
  });

  it("forwards scheduled sends without emitting human takeover events", async () => {
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const dispatcher = createBotDispatcher(dispatched);
    const app = createTestApp({
      crmBotWebhookDispatcher: dispatcher,
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createZapiConnection(),
      ]),
      crmWhatsappGateway: { sendText: createSendTextSpy() },
      crmWhatsappRepository: createMemoryCrmWhatsappRepository(),
    });

    await configureBot(app);
    const inboundResponse = await postZapiWebhook(app);
    const inbound = (await inboundResponse.json()) as {
      session: { id: string };
    };
    expect(inboundResponse.status).toBe(201);
    expect(dispatched).toHaveLength(1);

    const scheduleResponse = await app.request(
      "/api/v1/crm/whatsapp/scheduled-messages",
      jsonRequest({
        scheduledAt: "2030-01-01T10:00:00.000Z",
        sessionId: inbound.session.id,
        text: "Mensagem agendada.",
      }),
    );
    expect(scheduleResponse.status).toBe(201);

    const processResponse = await app.request(
      "/api/v1/crm/whatsapp/scheduled-messages/process-due",
      jsonRequest({
        dueAt: "2030-01-01T10:00:30.000Z",
        limit: 10,
      }),
    );
    expect(processResponse.status).toBe(200);
    await expect(processResponse.json()).resolves.toMatchObject({
      failed: 0,
      processed: 1,
      sent: 1,
    });

    expect(
      dispatched.some((item) => item.payload.event === "intervention_started"),
    ).toBe(false);
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "message",
      message: {
        content: "Mensagem agendada.",
        direction: "outbound",
        senderOrigin: "system",
      },
      session: { status: "ACTIVE" },
    });
  });
});
