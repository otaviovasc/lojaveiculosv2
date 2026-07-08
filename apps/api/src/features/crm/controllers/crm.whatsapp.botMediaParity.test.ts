import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { DispatchCrmBotWebhookInput } from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import type { CrmWhatsappSendMediaInput } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import {
  configureBot,
  connectionId,
  createBotDispatcher,
  jsonRequest,
} from "./crm.whatsapp.botForwarding.testSupport.js";
import {
  createTestApp,
  expectApiError,
} from "./crm.whatsapp.controller.testSupport.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM WhatsApp bot media action parity", () => {
  it.each([
    ["send_image", "imageUrl", "image", false],
    ["send_audio", "audioUrl", "audio", true],
    ["send_document", "documentUrl", "document", false],
  ] as const)(
    "sends %s with the canonical remote URL field",
    async (action, urlField, mediaType, asyncProcessing) => {
      const dispatched: DispatchCrmBotWebhookInput[] = [];
      const whatsappRepository = createMemoryCrmWhatsappRepository();
      const inbound = await seedSession(whatsappRepository);
      const sendMedia = createSendMediaSpy(action);
      const app = createBotActionApp({
        crmBotWebhookDispatcher: createBotDispatcher(dispatched),
        crmWhatsappGateway: { sendMedia },
        crmWhatsappRepository: whatsappRepository,
      });
      await configureBot(app);

      const mediaUrl = `https://cdn.example.test/${action}.bin`;
      const response = await app.request(
        "/api/v1/crm/whatsapp/integrations/bot/actions",
        jsonRequest(
          {
            action,
            payload: {
              caption: "Arquivo do veiculo",
              fileName: "arquivo.pdf",
              [urlField]: mediaUrl,
            },
            sessionId: inbound.session.id,
          },
          { "X-Webhook-Secret": "bot-secret-value" },
        ),
      );

      expect(response.status).toBe(200);
      const providerInput = sendMedia.mock.calls[0]?.[1];
      expect(providerInput).toMatchObject({ mediaType, mediaUrl });
      expect(providerInput).toMatchObject({ phone: "5511999999999" });
      expect(providerInput).not.toHaveProperty("base64");
      expect(providerInput?.asyncProcessing ?? false).toBe(asyncProcessing);
      const message = await whatsappRepository.findMessageByExternalId({
        connectionId,
        externalId: `${action}-external`,
        storeId,
        tenantId,
      });
      expect(message).toMatchObject({ mediaType, mediaUrl, senderType: "AI" });
      expect(message?.metadata).toMatchObject({
        media: { source: "remote_url" },
        sentByBot: true,
        sentByCrm: true,
      });
      expect(dispatched.at(-1)?.payload).toMatchObject({
        event: "message",
        message: { mediaUrl, senderOrigin: "bot_api", wasSentByApi: true },
      });
    },
  );

  it("rejects base64-only media on the external bot API", async () => {
    const sendMedia = vi.fn();
    const app = createBotActionApp({ crmWhatsappGateway: { sendMedia } });
    await configureBot(app);

    const response = await app.request(
      "/api/v1/crm/whatsapp/integrations/bot/actions",
      jsonRequest(
        {
          action: "send_image",
          connectionId,
          payload: {
            base64: "data:image/jpeg;base64,...",
            caption: "Foto",
            phone: "5511999999999",
          },
        },
        { "X-Webhook-Secret": "bot-secret-value" },
      ),
    );

    expect(response.status).toBe(400);
    await expectApiError(response, {
      code: "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
      message: "Payload field imageUrl is required.",
    });
    expect(sendMedia).not.toHaveBeenCalled();
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

function createSendMediaSpy(action: string) {
  return vi.fn(
    async (_connection: CrmConnection, _input: CrmWhatsappSendMediaInput) => ({
      externalId: `${action}-external`,
      providerTimestamp: new Date("2026-07-02T19:02:00.000Z"),
      raw: { messageId: `${action}-external` },
    }),
  );
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
