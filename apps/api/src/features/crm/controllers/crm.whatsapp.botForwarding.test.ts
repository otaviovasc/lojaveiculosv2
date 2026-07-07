import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type {
  CrmBotWebhookDispatcher,
  DispatchCrmBotWebhookInput,
} from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp bot webhook forwarding", () => {
  it("mirrors Repasses inbound, outbound, and intervention events", async () => {
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const dispatcher: CrmBotWebhookDispatcher = {
      actionApiBaseUrl:
        "https://api.example.test/api/v1/crm/whatsapp/integrations/bot/actions",
      dispatch: vi.fn(async (input) => {
        dispatched.push(input);
      }),
    };
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const sendText = createSendTextSpy();
    const app = createTestApp({
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
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "intervention_started",
      intervention: { active: true, triggeredBy: "human" },
      session: { isBotActive: false, status: "HUMAN_TAKEOVER" },
    });

    const pausedInbound = await postZapiWebhook(app, {
      messageId: "zapi-inbound-paused",
      text: { message: "Tem alguem ai?" },
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
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "intervention_ended",
      intervention: { active: false, triggeredBy: "bot" },
    });

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
  });
});

async function configureBot(app: ReturnType<typeof createTestApp>) {
  const response = await app.request(
    "/api/v1/crm/whatsapp/integrations/bot",
    jsonRequest(
      {
        enabled: true,
        webhookSecret: "bot-secret-value",
        webhookUrl: "https://bot.example.test/webhook",
      },
      undefined,
      "PATCH",
    ),
  );
  expect(response.status).toBe(200);
}

function postZapiWebhook(
  app: ReturnType<typeof createTestApp>,
  overrides: Record<string, unknown> = {},
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    jsonRequest({
      messageId: "zapi-inbound-forward-1",
      phone: "5511999999999",
      senderName: "Ana",
      text: { message: "Ola, tenho interesse" },
      timestamp: 1783029600,
      ...overrides,
    }),
  );
}

function jsonRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method,
  };
}

function createSendTextSpy() {
  let count = 0;
  return vi.fn(async () => {
    count += 1;
    const externalId = `zapi-outbound-${count}`;
    return {
      externalId,
      providerTimestamp: new Date(`2026-07-02T19:0${count}:00.000Z`),
      raw: { messageId: externalId },
    };
  });
}

function createZapiConnection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: "5511999999999",
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function requireDispatch(
  dispatched: readonly DispatchCrmBotWebhookInput[],
  index: number,
) {
  const value = dispatched[index];
  expect(value).toBeDefined();
  if (!value) throw new Error(`Missing dispatch at index ${index}.`);
  return value;
}
