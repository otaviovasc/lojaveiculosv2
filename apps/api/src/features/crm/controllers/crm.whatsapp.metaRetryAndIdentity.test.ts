import { createHmac } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmWebhookEventRepository } from "../adapters/memory/crmWebhookEventRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

const appSecret = "meta-retry-identity-secret";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const previousAppSecret = process.env.CRM_META_APP_SECRET;

describe("CRM Meta webhook retry and channel identity", () => {
  beforeEach(() => {
    process.env.CRM_META_APP_SECRET = appSecret;
  });

  afterEach(() => {
    if (previousAppSecret === undefined) delete process.env.CRM_META_APP_SECRET;
    else process.env.CRM_META_APP_SECRET = previousAppSecret;
  });

  it("keeps Instagram scoped IDs out of buyer phone identity", async () => {
    const leads = createMemoryCrmRepository();
    const cycles = createMemoryCrmConversationRepository();
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("instagram", "ig-business-1"),
      ]),
      crmRepository: leads,
      crmConversationRepository: cycles,
    });

    const response = await signedRequest(
      app,
      instagramPayload(["ig-contact-1", "ig-contact-2"]),
    );

    expect(response.status).toBe(200);
    const storedCycles = await cycles.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    expect(storedCycles).toHaveLength(2);
    expect(storedCycles.map((cycle) => cycle.externalThreadId).sort()).toEqual([
      "ig-contact-1",
      "ig-contact-2",
    ]);
    expect(storedCycles.every((cycle) => cycle.customerPhone === "")).toBe(
      true,
    );

    const storedLeads = await leads.listLeads({
      limit: 10,
      offset: 0,
      source: "instagram",
      storeId,
      tenantId,
    });
    expect(storedLeads).toHaveLength(2);
    expect(storedLeads.every((lead) => lead.buyerPhone === null)).toBe(true);
  });

  it("retries side effects after the message was already persisted", async () => {
    const repository = createMemoryCrmConversationRepository();
    const webhookEvents = createMemoryCrmWebhookEventRepository();
    const publish = vi
      .fn()
      .mockRejectedValueOnce(new Error("realtime temporarily unavailable"))
      .mockResolvedValue(undefined);
    const app = createTestApp({
      crmConnectionRepository: createMemoryCrmConnectionRepository([
        createConnection("whatsapp", "phone-number-1"),
      ]),
      crmRealtimePublisher: { publish },
      crmWebhookEventRepository: webhookEvents,
      crmConversationRepository: repository,
    });
    const payload = whatsappPayload();

    expect((await signedRequest(app, payload)).status).toBe(500);
    const retry = await signedRequest(app, payload);

    expect(retry.status).toBe(200);
    await expect(retry.json()).resolves.toMatchObject({ processed: 1 });
    expect(publish).toHaveBeenCalledTimes(3);
    const [cycle] = await repository.listConversationCycles({
      limit: 10,
      offset: 0,
      storeId,
      tenantId,
    });
    const messages = await repository.listMessages({
      limit: 10,
      offset: 0,
      cycleId: cycle!.id,
      storeId,
      tenantId,
    });
    expect(messages).toHaveLength(1);
    await expect(
      webhookEvents.list({ limit: 10, offset: 0, storeId, tenantId }),
    ).resolves.toEqual([expect.objectContaining({ status: "processed" })]);
  });
});

function instagramPayload(contactIds: readonly string[]) {
  return {
    object: "instagram",
    entry: [
      {
        id: "ig-business-1",
        messaging: contactIds.map((contactId, index) => ({
          message: {
            mid: `ig-mid-${index + 1}`,
            text: `Mensagem ${index + 1}`,
          },
          recipient: { id: "ig-business-1" },
          sender: { id: contactId },
          timestamp: 1785175200000 + index,
        })),
      },
    ],
  };
}

function whatsappPayload() {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              messages: [
                {
                  from: "5511999999999",
                  id: "wamid.retry-side-effects",
                  text: { body: "Retry me" },
                  timestamp: "1785175200",
                  type: "text",
                },
              ],
              metadata: { phone_number_id: "phone-number-1" },
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
  channel: "instagram" | "whatsapp",
  externalConnectionId: string,
): CrmConnection {
  return {
    broker: "composio",
    channel,
    credentialsRef: {},
    displayName: channel,
    externalConnectionId,
    externalInstanceId: null,
    id:
      channel === "instagram"
        ? "25000000-0000-4000-8000-000000000302"
        : "25000000-0000-4000-8000-000000000301",
    metadata: {},
    phone: null,
    provider: "meta_cloud",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
