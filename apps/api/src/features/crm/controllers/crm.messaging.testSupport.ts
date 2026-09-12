import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { vi } from "vitest";
import {
  createConfiguredZapiTestConnection,
  withTestZapiWebhookToken,
} from "./crm.channelConnections.testSupport.js";
import type { createTestApp } from "./crm.controller.testSupport.js";

export const connectionId = "24000000-0000-4000-8000-000000000101";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

export function postZapiWebhook(
  app: ReturnType<typeof createTestApp>,
  overrides: Record<string, unknown> = {},
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    jsonRequest(
      {
        messageId: "zapi-inbound-forward-1",
        phone: "5511999999999",
        senderName: "Ana",
        text: { message: "Ola, tenho interesse" },
        timestamp: 1783018800,
        ...overrides,
      },
      withTestZapiWebhookToken(),
    ),
  );
}

export function jsonRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  method = "POST",
) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method,
  };
}

export function createSendTextSpy() {
  let count = 0;
  return vi.fn(async () => {
    count += 1;
    const externalId = `zapi-outbound-${count}`;
    return {
      externalId,
      providerTimestamp: new Date(`2026-07-02T19:0${count}:00.000Z`),
      raw: { messageId: externalId },
    };
  });
}

export function createZapiConnection() {
  return createConfiguredZapiTestConnection({
    id: connectionId,
    overrides: { phone: "5511999999999" },
    storeId,
    tenantId,
  });
}
