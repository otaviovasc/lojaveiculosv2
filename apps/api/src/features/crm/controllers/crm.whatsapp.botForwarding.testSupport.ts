import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { expect, vi } from "vitest";
import type {
  CrmBotWebhookDispatcher,
  DispatchCrmBotWebhookInput,
} from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { createTestApp } from "./crm.whatsapp.controller.testSupport.js";

export const connectionId = "24000000-0000-4000-8000-000000000101";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

export function createBotDispatcher(
  dispatched: DispatchCrmBotWebhookInput[],
): CrmBotWebhookDispatcher {
  return {
    actionApiBaseUrl:
      "https://api.example.test/api/v1/crm/whatsapp/integrations/bot/actions",
    dispatch: vi.fn(async (input) => {
      dispatched.push(input);
    }),
  };
}

export async function configureBot(app: ReturnType<typeof createTestApp>) {
  const response = await app.request(
    "/api/v1/crm/whatsapp/integrations/bot",
    jsonRequest(
      {
        enabled: true,
        webhookSecret: "bot-secret-value",
        webhookUrl: "https://bot.example.test/webhook",
      },
      undefined,
      "PATCH",
    ),
  );
  expect(response.status).toBe(200);
}

export function postZapiWebhook(
  app: ReturnType<typeof createTestApp>,
  overrides: Record<string, unknown> = {},
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    jsonRequest({
      messageId: "zapi-inbound-forward-1",
      phone: "5511999999999",
      senderName: "Ana",
      text: { message: "Ola, tenho interesse" },
      timestamp: 1783018800,
      ...overrides,
    }),
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

export function createZapiConnection(): CrmConnection {
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

export function requireDispatch(
  dispatched: readonly DispatchCrmBotWebhookInput[],
  index: number,
) {
  const value = dispatched[index];
  expect(value).toBeDefined();
  if (!value) throw new Error(`Missing dispatch at index ${index}.`);
  return value;
}
