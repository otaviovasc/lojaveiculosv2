import { createHmac } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const appSecret = "meta-app-secret";
const verifyToken = "meta-verify-token";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
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
    const repository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("composio_whatsapp", "phone-number-1"),
      ]),
      crmWhatsappRepository: repository,
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

    const [session] = await repository.listSessions({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(session).toMatchObject({
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      channelExternalId: "5511999999999",
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
      sessionId: session!.id,
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
    const repository = createMemoryCrmWhatsappRepository();
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("composio_instagram", "ig-business-1"),
      ]),
      crmWebhookEventRepository: webhookEvents,
      crmWhatsappRepository: repository,
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
    const [session] = await repository.listSessions({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    const [message] = await repository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: session!.id,
      storeId,
      tenantId,
    });
    expect(session?.channel).toBe("INSTAGRAM");
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
      provider: "composio_instagram",
    });
    const [webhookEvent] = await webhookEvents.list({
      limit: 10,
      offset: 0,
      provider: "composio_instagram",
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

function whatsappPayload(value: Record<string, unknown>) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-number-1" },
              ...value,
            },
          },
        ],
      },
    ],
  };
}

function signedRequest(
  app: ReturnType<typeof createTestApp>,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", appSecret).update(body).digest("hex");
  return app.request("/api/v1/crm/webhooks/meta", {
    body,
    headers: { "x-hub-signature-256": `sha256=${signature}` },
    method: "POST",
  });
}

function createConnection(
  provider: "composio_instagram" | "composio_whatsapp",
  externalConnectionId: string,
): CrmConnection {
  return {
    credentialsRef: {},
    displayName: provider,
    externalConnectionId,
    externalInstanceId: null,
    id:
      provider === "composio_instagram"
        ? "25000000-0000-4000-8000-000000000202"
        : "25000000-0000-4000-8000-000000000201",
    metadata: {},
    phone: null,
    provider,
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
