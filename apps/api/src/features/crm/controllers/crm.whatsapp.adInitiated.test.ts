import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
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

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp ad-initiated conversations", () => {
  it("links a notification-only conversation to its canonical lead", async () => {
    const { app, whatsappRepository } = createAdTestApp();

    const response = await postZapiWebhook(app, {
      externalAdReply: adReply(),
      messageId: "zapi-new-ad-notification-1",
      notification: true,
      text: { message: "Mensagem automatica do anuncio" },
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      conversationCycle: { id: string; leadId: string | null };
    };
    expect(payload.conversationCycle.leadId).toEqual(expect.any(String));
    await expect(
      whatsappRepository.listConversationCycles({
        limit: 1,
        offset: 0,
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject([{ leadId: payload.conversationCycle.leadId }]);
  });

  it("resumes automation before forwarding an attributed buyer message", async () => {
    const { app, whatsappRepository } = createAdTestApp();
    const cycleId = await startHumanTakeover(app);

    const response = await postZapiWebhook(app, {
      externalAdReply: adReply(),
      messageId: "zapi-ad-inbound-1",
      text: { message: "Vi o anuncio. Ainda esta disponivel?" },
      timestamp: 1_783_018_980,
    });

    expect(response.status).toBe(201);
    await expect(response.clone().json()).resolves.toMatchObject({
      conversationCycle: {
        id: cycleId,
        metadata: {
          adBody: "Civic Touring com baixa quilometragem",
          adDetectionMethod: "external_ad_reply",
          adSourceApp: "facebook",
          adSourceId: "ad-civic-123",
          adTitle: "Civic Touring 2024",
          isAdInitiated: true,
        },
        status: "ACTIVE",
      },
    });
    const [cycle] = await whatsappRepository.listConversationCycles({
      limit: 1,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(cycle).toMatchObject({
      humanTakeoverAt: null,
      metadata: { isAdInitiated: true },
      status: "ACTIVE",
    });
  });

  it("captures an ad notification without a message and resumes the next buyer turn", async () => {
    const { app, whatsappRepository } = createAdTestApp();
    const cycleId = await startHumanTakeover(app);
    const before = await listMessages(whatsappRepository, cycleId);

    const notification = await postZapiWebhook(app, {
      externalAdReply: adReply(),
      messageId: "zapi-ad-notification-1",
      notification: true,
      text: { message: "Mensagem automatica do anuncio" },
    });

    expect(notification.status).toBe(200);
    await expect(notification.clone().json()).resolves.toMatchObject({
      conversationCycle: {
        id: cycleId,
        metadata: {
          adDetectionMethod: "notification_webhook",
          isAdInitiated: true,
        },
        status: "ACTIVE",
      },
      status: "captured",
    });
    expect(await listMessages(whatsappRepository, cycleId)).toHaveLength(
      before.length,
    );
    const retry = await postZapiWebhook(app, {
      externalAdReply: adReply(),
      messageId: "zapi-ad-notification-1",
      notification: true,
      text: { message: "Mensagem automatica do anuncio" },
    });
    expect(retry.status).toBe(200);
    expect(await listMessages(whatsappRepository, cycleId)).toHaveLength(
      before.length,
    );

    const buyerReply = await postZapiWebhook(app, {
      messageId: "zapi-after-ad-notification-1",
      text: { message: "Boa tarde" },
    });
    expect(buyerReply.status).toBe(201);
    await expect(buyerReply.json()).resolves.toMatchObject({
      conversationCycle: {
        metadata: { adSourceId: "ad-civic-123", isAdInitiated: true },
      },
    });
  });
});

function createAdTestApp() {
  const whatsappRepository = createMemoryCrmConversationRepository();
  const app = createTestApp({
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(),
    ]),
    crmMessagingGateway: { sendText: createSendTextSpy() },
    crmConversationRepository: whatsappRepository,
  });
  return { app, whatsappRepository };
}

async function startHumanTakeover(app: ReturnType<typeof createTestApp>) {
  const initialResponse = await postZapiWebhook(app);
  const initial = (await initialResponse.json()) as {
    conversationCycle: { id: string };
  };
  expect(initialResponse.status).toBe(201);
  const humanResponse = await app.request(
    `/api/v1/crm/conversation-cycles/${initial.conversationCycle.id}/messages`,
    jsonRequest({
      content: "Vou assumir por alguns minutos.",
    }),
  );
  expect(humanResponse.status).toBe(201);
  return initial.conversationCycle.id;
}

function listMessages(
  repository: ReturnType<typeof createMemoryCrmConversationRepository>,
  cycleId: string,
) {
  return repository.listMessages({
    limit: 20,
    offset: 0,
    cycleId,
    storeId,
    tenantId,
  });
}

function adReply() {
  return {
    body: "Civic Touring com baixa quilometragem",
    mediaType: 1,
    sourceApp: "facebook",
    sourceId: "ad-civic-123",
    sourceType: "ad",
    sourceUrl: "https://facebook.example.test/ads/civic-123",
    thumbnailUrl: "https://cdn.example.test/civic-123.jpg",
    title: "Civic Touring 2024",
  };
}
