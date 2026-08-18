import { createHmac } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmWhatsappRepository } from "../adapters/memory/crmWhatsappRepository.js";
import { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

const appSecret = "meta-ordering-secret";
const externalMessageId = "wamid.status-before-message-1";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const previousAppSecret = process.env.CRM_META_APP_SECRET;

describe("CRM Meta status ordering", () => {
  beforeEach(() => {
    process.env.CRM_META_APP_SECRET = appSecret;
  });

  afterEach(() => {
    if (previousAppSecret === undefined) delete process.env.CRM_META_APP_SECRET;
    else process.env.CRM_META_APP_SECRET = previousAppSecret;
  });

  it("keeps an early status retryable until the outbound message exists", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection(),
      ]),
      crmWebhookEventRepository: webhookEvents,
      crmWhatsappRepository: repository,
    });
    const payload = statusPayload();

    const early = await signedRequest(app, payload);

    expect(early.status).toBe(500);
    const [failedEvent] = await webhookEvents.list({
      limit: 10,
      offset: 0,
      provider: "composio_whatsapp",
      status: "failed",
      storeId,
      tenantId,
    });
    expect(failedEvent).toMatchObject({
      eventType: "meta.status",
      providerEventId: `meta:composio_whatsapp:status:READ:phone-number-1:${externalMessageId}`,
      status: "failed",
    });

    const seeded = await repository.ingestMessage({
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: createConnection().id,
      content: "Template enviado",
      direction: "OUTBOUND",
      externalId: externalMessageId,
      metadata: {},
      providerTimestamp: new Date("2026-07-27T20:00:00.000Z"),
      senderOrigin: "human_crm",
      senderType: "HUMAN",
      status: "SENT",
      storeId,
      tenantId,
      type: "TEMPLATE",
    });

    const retried = await signedRequest(app, payload);

    expect(retried.status).toBe(200);
    await expect(retried.json()).resolves.toMatchObject({ processed: 1 });
    const [message] = await repository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: seeded.session.id,
      storeId,
      tenantId,
    });
    expect(message?.status).toBe("READ");
    expect(message?.providerTimestamp).toEqual(
      new Date("2026-07-27T20:00:00.000Z"),
    );
    expect(message?.metadata).toMatchObject({
      providerStatus: "READ",
      providerStatusAt: new Date(1785182460 * 1_000).toISOString(),
    });
    const [processedEvent] = await webhookEvents.list({
      limit: 10,
      offset: 0,
      provider: "composio_whatsapp",
      status: "processed",
      storeId,
      tenantId,
    });
    expect(processedEvent?.id).toBe(failedEvent?.id);
  });

  it("does not replace a read message with a late failed status", async () => {
    const repository = createMemoryCrmWhatsappRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection(),
      ]),
      crmWebhookEventRepository: createMemoryCrmWebhookEventRepository(),
      crmWhatsappRepository: repository,
    });
    const seeded = await repository.ingestMessage({
      buyerPhone: "5511999999999",
      channel: "WHATSAPP",
      connectionId: createConnection().id,
      content: "Mensagem lida",
      direction: "OUTBOUND",
      externalId: externalMessageId,
      metadata: {},
      providerTimestamp: new Date("2026-07-27T20:00:00.000Z"),
      senderOrigin: "human_crm",
      senderType: "HUMAN",
      status: "READ",
      storeId,
      tenantId,
      type: "TEXT",
    });

    const response = await signedRequest(app, statusPayload("failed"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ignored: 1 });
    const [message] = await repository.listMessages({
      limit: 10,
      offset: 0,
      sessionId: seeded.session.id,
      storeId,
      tenantId,
    });
    expect(message?.status).toBe("READ");
  });
});

function statusPayload(status = "read") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-number-1" },
              statuses: [
                {
                  id: externalMessageId,
                  recipient_id: "5511999999999",
                  status,
                  timestamp: "1785182460",
                },
              ],
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

function createConnection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "WhatsApp oficial",
    externalConnectionId: "phone-number-1",
    externalInstanceId: null,
    id: "26000000-0000-4000-8000-000000000102",
    metadata: {},
    phone: "5511999999999",
    provider: "composio_whatsapp",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
