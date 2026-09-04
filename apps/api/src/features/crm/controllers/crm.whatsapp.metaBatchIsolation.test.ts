import { createHmac } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const appSecret = "meta-batch-isolation-secret";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const previousAppSecret = process.env.CRM_META_APP_SECRET;

describe("CRM Meta webhook batch isolation", () => {
  beforeEach(() => {
    process.env.CRM_META_APP_SECRET = appSecret;
  });

  afterEach(() => {
    if (previousAppSecret === undefined) delete process.env.CRM_META_APP_SECRET;
    else process.env.CRM_META_APP_SECRET = previousAppSecret;
  });

  it("processes later events before returning a retryable failure", async () => {
    const repository = createMemoryCrmConversationRepository();
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const connection = createConnection();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        connection,
      ]),
      crmWebhookEventRepository: webhookEvents,
      crmConversationRepository: repository,
    });

    const response = await signedRequest(app, {
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
                    id: "wamid.not-persisted",
                    recipient_id: "5511999999999",
                    status: "read",
                    timestamp: "1785182460",
                  },
                ],
              },
            },
            {
              field: "messages",
              value: {
                messages: [
                  {
                    from: "5511999999999",
                    id: "wamid.after-failure",
                    text: { body: "Mensagem posterior" },
                    timestamp: "1785182461",
                    type: "text",
                  },
                ],
                metadata: { phone_number_id: "phone-number-1" },
              },
            },
          ],
        },
      ],
    });

    expect(response.status).toBe(500);
    await expect(
      repository.findMessageByExternalId({
        connectionId: connection.id,
        externalId: "wamid.after-failure",
        storeId,
        tenantId,
      }),
    ).resolves.toMatchObject({ content: "Mensagem posterior" });
    await expect(
      webhookEvents.list({ limit: 10, offset: 0, storeId, tenantId }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "failed" }),
        expect.objectContaining({ status: "processed" }),
      ]),
    );
  });
});

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
    broker: "composio",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "WhatsApp oficial",
    externalConnectionId: "phone-number-1",
    externalInstanceId: null,
    id: "26000000-0000-4000-8000-000000000102",
    metadata: {},
    phone: "5511999999999",
    provider: "meta_cloud",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
