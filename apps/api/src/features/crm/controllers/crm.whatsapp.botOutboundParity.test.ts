import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DispatchCrmBotWebhookInput } from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  configureBot,
  connectionId,
  createBotDispatcher,
  createSendTextSpy,
  jsonRequest,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp bot outbound parity", () => {
  it("starts a bot-authored conversation from connection and phone", async () => {
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const sendText = createSendTextSpy();
    const app = createBotActionApp({
      crmBotWebhookDispatcher: createBotDispatcher(dispatched),
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "send_text",
          connectionId,
          payload: {
            buyerName: "Ana Premium",
            phone: "(11) 99999-9999",
            text: "Ola, sou o assistente da loja.",
          },
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );

    expect(response.status).toBe(200);
    expect(sendText).toHaveBeenCalledWith(expect.anything(), {
      phone: "5511999999999",
      text: "Ola, sou o assistente da loja.",
    });
    const message = await whatsappRepository.findMessageByExternalId({
      connectionId,
      externalId: "zapi-outbound-1",
      storeId,
      tenantId,
    });
    expect(message).toMatchObject({ senderType: "AI", status: "SENT" });
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "message",
      message: {
        providerMessageId: "zapi-outbound-1",
        senderOrigin: "bot_api",
        wasSentByApi: true,
      },
    });
  });

  it("blocks phone-based bot sends during human takeover", async () => {
    const whatsappRepository = createMemoryCrmWhatsappRepository();
    const inbound = await seedSession(whatsappRepository);
    await whatsappRepository.updateSession({
      humanTakeoverAt: new Date("2026-07-02T19:01:00.000Z"),
      sessionId: inbound.session.id,
      status: "HUMAN_TAKEOVER",
      storeId,
      tenantId,
    });
    const sendText = vi.fn();
    const app = createBotActionApp({
      crmWhatsappGateway: { sendText },
      crmWhatsappRepository: whatsappRepository,
    });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "send_text",
          connectionId,
          payload: { phone: "5511999999999", text: "Resposta automatica" },
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );

    expect(response.status).toBe(409);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_ACTION_BLOCKED",
      message: "Bot sends are blocked while human takeover is active.",
    });
    expect(sendText).not.toHaveBeenCalled();
  });

  it("forwards ZAPI connection status changes to the configured bot", async () => {
    const dispatched: DispatchCrmBotWebhookInput[] = [];
    const app = createBotActionApp({
      crmBotWebhookDispatcher: createBotDispatcher(dispatched),
    });
    await configureBot(app);

    const response = await app.request(
      `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/connected`,
      jsonRequest({ connected: true, connectedPhone: "5511888887777" }),
    );

    expect(response.status).toBe(200);
    expect(dispatched).toHaveLength(1);
    const payload = dispatched[0]?.payload;
    expect(payload).toMatchObject({
      connection: { phone: "5511888887777", status: "active" },
      event: "connection_status_changed",
      previousStatus: "sandbox",
      reason: "connected",
      status: "active",
    });
    expect(payload).not.toHaveProperty("chat");
    expect(payload).not.toHaveProperty("session");
  });
});

function createBotActionApp(options: Parameters<typeof createTestApp>[0] = {}) {
  return createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]),
    ...options,
  });
}

async function seedSession(
  whatsappRepository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
) {
  return whatsappRepository.ingestMessage({
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connectionId,
    content: "Tenho interesse",
    direction: "INBOUND",
    externalId: "inbound-for-bot-action",
    metadata: {},
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
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
