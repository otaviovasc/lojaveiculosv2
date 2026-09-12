import type { AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { expect } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmOlxWebhookSecurity } from "../../../domains/crm/ports/crmOlxWebhookSecurity.js";
import { createMemoryCrmConnectionRepository } from "../adapters/memory/crmConnectionRepository.js";
import { createMemoryCrmConversationRepository } from "../adapters/memory/crmConversationRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";

export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;
export const connectionA = "24000000-0000-4000-8000-000000000101";
export const connectionB = "24000000-0000-4000-8000-000000000102";

export function createWebhookAuthApp(
  entitlements: EntitlementKey[] = ["crm"],
  audit?: AuditSink,
  crmOlxWebhookSecurity?: CrmOlxWebhookSecurity,
) {
  return createTestApp({
    ...(audit ? { audit } : {}),
    ...(crmOlxWebhookSecurity ? { crmOlxWebhookSecurity } : {}),
    crmConnectionCredentialVault: {
      open: async ({ sealed }) => sealed.replace(/^sealed:/u, ""),
      seal: async ({ plaintext }) => `sealed:${plaintext}`,
    },
    crmConnectionRepository: createMemoryCrmConnectionRepository([
      createZapiConnection(connectionA, "secret-a", storeId, tenantId),
      createZapiConnection(
        connectionB,
        "secret-b",
        "store_2" as StoreId,
        "tenant_2" as TenantId,
      ),
    ]),
    crmConversationRepository: createMemoryCrmConversationRepository(),
    resolveBotEntitlements: async ({ context, storeId, tenantId }) => {
      expect(context).toMatchObject({ storeId, tenantId });
      return entitlements;
    },
  });
}

export function postReceived(
  app: ReturnType<typeof createTestApp>,
  connectionId: string,
  token?: string,
) {
  return app.request(
    `/api/v1/crm/whatsapp/webhooks/zapi/${connectionId}/received`,
    {
      body: JSON.stringify({
        messageId: `zapi-auth-${connectionId}`,
        phone: "5511999999999",
        senderName: "Ana",
        text: { message: "Ola" },
        timestamp: 1783029600,
      }),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-crm-webhook-token": token } : {}),
      },
      method: "POST",
    },
  );
}

function createZapiConnection(
  id: string,
  secret: string,
  connectionStoreId: StoreId,
  connectionTenantId: TenantId,
): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: { stored: { webhookSecret: `sealed:${secret}` } },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: connectionStoreId,
    tenantId: connectionTenantId,
    webhookUrl: null,
  };
}
