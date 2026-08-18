import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import {
  createMetaConnection as createConnection,
  metaAppSecret as appSecret,
  metaStoreId as storeId,
  metaTenantId as tenantId,
  metaVerifyToken as verifyToken,
  restoreEnv,
  signedMetaRequest as signedRequest,
  whatsappPayload,
} from "./crm.whatsapp.metaWebhooks.testSupport.js";

const previousAppSecret = process.env.CRM_META_APP_SECRET;
const previousVerifyToken = process.env.CRM_META_WEBHOOK_VERIFY_TOKEN;

describe("CRM official Meta webhooks", () => {
  beforeEach(() => {
    process.env.CRM_META_APP_SECRET = appSecret;
    process.env.CRM_META_WEBHOOK_VERIFY_TOKEN = verifyToken;
  });

  afterEach(() => {
    restoreEnv("CRM_META_APP_SECRET", previousAppSecret);
    restoreEnv("CRM_META_WEBHOOK_VERIFY_TOKEN", previousVerifyToken);
  });

  it("verifies the Meta challenge and rejects invalid signatures", async () => {
    const app = createTestApp();
    const challenge = await app.request(
      `/api/v1/crm/webhooks/meta?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge-123`,
    );
    expect(challenge.status).toBe(200);
    await expect(challenge.text()).resolves.toBe("challenge-123");

    const rejected = await app.request("/api/v1/crm/webhooks/meta", {
      body: JSON.stringify({ object: "whatsapp_business_account" }),
      headers: { "x-hub-signature-256": "sha256=invalid" },
      method: "POST",
    });
    expect(rejected.status).toBe(403);
  });

  it("ingests and deduplicates official WhatsApp messages and statuses", async () => {
    const repository = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("whatsapp", "phone-number-1"),
      ]),
      crmConversationRepository: repository,
    });
    const messagePayload = whatsappPayload({
      messages: [
        {
          from: "5511999999999",
          id: "wamid.official-1",
          text: { body: "Tenho interesse" },
          timestamp: "1785175200",
          type: "text",
        },
      ],
    });

    const first = await signedRequest(app, messagePayload);
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({
      duplicates: 0,
      ignored: 0,
      processed: 1,
      total: 1,
    });
    const duplicate = await signedRequest(app, messagePayload);
    await expect(duplicate.json()).resolves.toMatchObject({ duplicates: 1 });

    const [cycle] = await repository.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(cycle).toMatchObject({
      customerPhone: "5511999999999",
      channel: "WHATSAPP",
      externalThreadId: "5511999999999",
    });
    const status = await signedRequest(
      app,
      whatsappPayload({
        statuses: [
          {
            id: "wamid.official-1",
            recipient_id: "5511999999999",
            status: "read",
            timestamp: "1785175260",
          },
        ],
      }),
    );
    await expect(status.json()).resolves.toMatchObject({ processed: 1 });
    const [message] = await repository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: cycle!.id,
      storeId,
      tenantId,
    });
    expect(message).toMatchObject({
      channel: "WHATSAPP",
      channelMessageId: "wamid.official-1",
      status: "READ",
    });
  });

  it("ingests Instagram messages without treating provider media URLs as stored media", async () => {
    const repository = createMemoryCrmConversationRepository();
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("instagram", "ig-business-1"),
      ]),
      crmWebhookEventRepository: webhookEvents,
      crmConversationRepository: repository,
    });
    const response = await signedRequest(app, {
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              message: {
                attachments: [
                  {
                    payload: { url: "https://lookaside.instagram.test/x" },
                    type: "image",
                  },
                ],
                mid: "ig-mid-1",
              },
              recipient: { id: "ig-business-1" },
              sender: { id: "ig-contact-1" },
              timestamp: 1785175200000,
            },
          ],
        },
      ],
    });
    expect(response.status).toBe(200);
    const [cycle] = await repository.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    const [message] = await repository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: cycle!.id,
      storeId,
      tenantId,
    });
    expect(cycle?.channel).toBe("INSTAGRAM");
    expect(message).toMatchObject({
      content: "[image]",
      mediaType: "image",
      mediaUrl: null,
    });
    expect(message?.metadata).toMatchObject({
      media: {
        type: "image",
        url: null,
      },
      provider: "meta_cloud",
    });
    const [webhookEvent] = await webhookEvents.list({
      limit: 10,
      offset: 0,
      provider: "meta_cloud",
      storeId,
      tenantId,
    });
    expect(webhookEvent?.payload).toMatchObject({
      media: {
        type: "image",
        url: null,
      },
    });
  });
});
