import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
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

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp ad-initiated conversations", () => {
  it("resumes automation before forwarding an attributed buyer message", async () => {
    const { app, dispatched, whatsappRepository } = createAdTestApp();
    const sessionId = await startHumanTakeover(app, dispatched);

    const response = await postZapiWebhook(app, {
      externalAdReply: adReply(),
      messageId: "zapi-ad-inbound-1",
      text: { message: "Vi o anuncio. Ainda esta disponivel?" },
      timestamp: 1_783_018_980,
    });

    expect(response.status).toBe(201);
    await expect(response.clone().json()).resolves.toMatchObject({
      session: {
        id: sessionId,
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
    expect(dispatched.slice(-2).map((item) => item.payload.event)).toEqual([
      "intervention_ended",
      "message",
    ]);
    expect(dispatched.at(-2)?.payload).toMatchObject({
      event: "intervention_ended",
      intervention: {
        active: false,
        reason: "ad_initiated_conversation",
        triggeredBy: "system",
      },
      session: {
        adAttribution: {
          body: "Civic Touring com baixa quilometragem",
          sourceApp: "facebook",
          sourceId: "ad-civic-123",
          title: "Civic Touring 2024",
        },
        isBotActive: true,
        status: "ACTIVE",
      },
    });
    expect(dispatched.at(-2)?.payload.intervention?.summary).toContain(
      "Staff: Vou assumir por alguns minutos.",
    );
    expect(dispatched.at(-2)?.payload.intervention?.summary).not.toContain(
      "Vi o anuncio",
    );
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "message",
      message: { providerMessageId: "zapi-ad-inbound-1" },
      session: {
        adAttribution: { sourceId: "ad-civic-123" },
        isBotActive: true,
        status: "ACTIVE",
      },
    });

    const [session] = await whatsappRepository.listSessions({
      limit: 1,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(session).toMatchObject({
      humanTakeoverAt: null,
      metadata: { isAdInitiated: true },
      status: "ACTIVE",
    });
  });

  it("captures an ad notification without a message and resumes the next buyer turn", async () => {
    const { app, dispatched, whatsappRepository } = createAdTestApp();
    const sessionId = await startHumanTakeover(app, dispatched);
    const before = await listMessages(whatsappRepository, sessionId);

    const notification = await postZapiWebhook(app, {
      externalAdReply: adReply(),
      messageId: "zapi-ad-notification-1",
      notification: true,
      text: { message: "Mensagem automatica do anuncio" },
    });

    expect(notification.status).toBe(200);
    await expect(notification.clone().json()).resolves.toMatchObject({
      session: {
        id: sessionId,
        metadata: {
          adDetectionMethod: "notification_webhook",
          isAdInitiated: true,
        },
        status: "ACTIVE",
      },
      status: "captured",
    });
    expect(await listMessages(whatsappRepository, sessionId)).toHaveLength(
      before.length,
    );
    expect(dispatched.at(-1)?.payload.event).toBe("intervention_ended");
    const dispatchCount = dispatched.length;
    const retry = await postZapiWebhook(app, {
      externalAdReply: adReply(),
      messageId: "zapi-ad-notification-1",
      notification: true,
      text: { message: "Mensagem automatica do anuncio" },
    });
    expect(retry.status).toBe(200);
    expect(dispatched).toHaveLength(dispatchCount);
    expect(await listMessages(whatsappRepository, sessionId)).toHaveLength(
      before.length,
    );

    const buyerReply = await postZapiWebhook(app, {
      messageId: "zapi-after-ad-notification-1",
      text: { message: "Boa tarde" },
    });
    expect(buyerReply.status).toBe(201);
    expect(dispatched.at(-1)?.payload).toMatchObject({
      event: "message",
      message: { providerMessageId: "zapi-after-ad-notification-1" },
      session: {
        adAttribution: { sourceId: "ad-civic-123" },
        isBotActive: true,
        status: "ACTIVE",
      },
    });
  });
});

function createAdTestApp() {
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
  return { app, dispatched, whatsappRepository };
}

async function startHumanTakeover(
  app: ReturnType<typeof createTestApp>,
  dispatched: DispatchCrmBotWebhookInput[],
) {
  await configureBot(app);
  const initialResponse = await postZapiWebhook(app);
  const initial = (await initialResponse.json()) as { session: { id: string } };
  expect(initialResponse.status).toBe(201);
  const humanResponse = await app.request(
    "/api/v1/crm/whatsapp/send/text",
    jsonRequest({
      sessionId: initial.session.id,
      text: "Vou assumir por alguns minutos.",
    }),
  );
  expect(humanResponse.status).toBe(201);
  expect(dispatched.at(-1)?.payload.event).toBe("intervention_started");
  return initial.session.id;
}

function listMessages(
  repository: ReturnType<typeof createMemoryCrmWhatsappRepository>,
  sessionId: string,
) {
  return repository.listMessages({
    limit: 20,
    offset: 0,
    sessionId,
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
