import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const connectionId = "24000000-0000-4000-8000-000000000202";
const webhookSecret = "uazapi-webhook-secret";

function createUazapiConnection(): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: { stored: { webhookSecret: `sealed:${webhookSecret}` } },
    displayName: "UAZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: "instance-uazapi-1",
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function postUazapiWebhook(
  app: ReturnType<typeof createTestApp>,
  data: Record<string, unknown>,
) {
  return app.request(`/api/v1/crm/whatsapp/webhooks/uazapi/${connectionId}`, {
    body: JSON.stringify({
      event: "message",
      instance: "instance-uazapi-1",
      data,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-crm-webhook-token": webhookSecret,
    },
    method: "POST",
  });
}

describe("CRM WhatsApp Uazapi direct-phone messages", () => {
  it("stores a message the owner sent directly from WhatsApp", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createUazapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postUazapiWebhook(app, {
      chatid: "5511999999999@s.whatsapp.net",
      fromMe: false,
      messageid: "uazapi-direct-inbound",
      messageType: "conversation",
      sender: "5511999999999@s.whatsapp.net",
      senderName: "Ana",
      text: "Ola",
    });
    expect(inboundResponse.status).toBe(201);
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };

    const directResponse = await postUazapiWebhook(app, {
      chatName: "Ana",
      chatid: "5511999999999@s.whatsapp.net",
      fromMe: true,
      messageid: "uazapi-direct-owner-1",
      messageType: "conversation",
      sender: "5511990000000@s.whatsapp.net",
      text: "Resposta direta do zap",
    });
    expect(directResponse.status).toBe(201);
    await expect(directResponse.json()).resolves.toMatchObject({
      message: {
        direction: "OUTBOUND",
        externalId: "uazapi-direct-owner-1",
        senderOrigin: "human_channel",
        senderType: "HUMAN",
      },
      status: "stored",
    });

    const messages = await conversationRepository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: inbound.conversationCycle.id,
      storeId,
      tenantId,
    });
    expect(
      messages.some(
        (message) => message.externalId === "uazapi-direct-owner-1",
      ),
    ).toBe(true);
  });

  it("keeps a LID-only direct-phone message in the customer thread", async () => {
    const conversationRepository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createUazapiConnection(),
      ]),
      crmConversationRepository: conversationRepository,
    });
    const inboundResponse = await postUazapiWebhook(app, {
      chatid: "190680106279040@lid",
      fromMe: false,
      messageid: "uazapi-lid-inbound",
      messageType: "conversation",
      sender: "190680106279040@lid",
      sender_lid: "190680106279040@lid",
      sender_pn: "5511999999999@s.whatsapp.net",
      senderName: "Ana",
      text: "Ola pelo lid",
    });
    expect(inboundResponse.status).toBe(201);
    const inbound = (await inboundResponse.json()) as {
      conversationCycle: { id: string };
    };

    // sender/sender_pn/sender_lid here belong to the connected account and
    // must not re-key the conversation away from the customer chat.
    const directResponse = await postUazapiWebhook(app, {
      chatid: "190680106279040@lid",
      fromMe: true,
      messageid: "uazapi-lid-owner-1",
      messageType: "Conversation",
      sender: "5511990000000@s.whatsapp.net",
      sender_pn: "5511990000000@s.whatsapp.net",
      sender_lid: "104913803677822@lid",
      text: "Resposta direta no chat lid",
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
      storeId,
      tenantId,
    });
    expect(
      messages.some((message) => message.externalId === "uazapi-lid-owner-1"),
    ).toBe(true);
  });
});
