import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { vi } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

export const connectionId = "24000000-0000-4000-8000-000000000101";
export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;
const receivedAt = new Date("2026-08-10T12:01:00.000Z");
export const olxWebhookSecret =
  "olx_webhook_secret_0123456789abcdef0123456789abcdef";

export function postOlx(
  app: ReturnType<typeof createTestApp>,
  payload: Record<string, unknown>,
  secret = olxWebhookSecret,
) {
  return app.request(`/api/v1/crm/webhooks/olx/${connectionId}/received`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      "x-olx-webhook-secret": secret,
    },
    method: "POST",
  });
}

export function olxSecurity(options: { allowed?: boolean } = {}) {
  return {
    consume: vi.fn(async () => options.allowed ?? true),
    futureSkewMs: 60_000,
    maxAgeMs: 10 * 60_000,
    now: () => receivedAt,
  };
}

export function validPayload() {
  return {
    chatId: "olx-chat-1",
    email: "ana@example.com",
    listId: "listing-1",
    message: "Tenho interesse no carro",
    messageId: "olx-message-1",
    messageTimestamp: "2026-08-10T12:00:00.000Z",
    name: "Ana",
    origin: "buyer",
    phone: "11999999999",
    senderType: "account",
  };
}

export function createOlxConnection(): CrmConnection {
  return {
    credentialsRef: {
      stored: { webhookSecret: `sealed:${olxWebhookSecret}` },
    },
    displayName: "OLX Chat",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "olx_chat",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
