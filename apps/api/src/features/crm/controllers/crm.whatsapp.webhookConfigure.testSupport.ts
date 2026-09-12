import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";

export const webhookSetupStoreId =
  "26000000-0000-4000-8000-000000000001" as StoreId;
export const webhookSetupTenantId =
  "26000000-0000-4000-8000-000000000002" as TenantId;
export const webhookSetupConnectionId = "24000000-0000-4000-8000-000000000101";

export function createZapiWebhookTestConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      mode: "stored",
      stored: {
        clientToken: "sealed:client-token",
        instanceId: "zapi-instance-1",
        instanceToken: "zapi-secret",
        webhookSecret: "sealed:webhook-secret",
      },
    },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: webhookSetupConnectionId,
    metadata: withZapiWebhookSetupState(
      {},
      createZapiWebhookSetupIntent(webhookSetupConnectionId),
    ),
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId: webhookSetupStoreId,
    tenantId: webhookSetupTenantId,
    webhookUrl: null,
    ...overrides,
  };
}

export function secureWebhookSetupOptions() {
  const supportPermissions: PermissionKey[] = ["crm.messaging.support.manage"];
  return {
    crmConnectionCredentialVault: {
      open: async ({ sealed }: { sealed: string }) =>
        sealed.replace(/^sealed:/u, ""),
      seal: async ({ plaintext }: { plaintext: string }) =>
        `sealed:${plaintext}`,
    },
    crmZapiSupportAuthorizer: {
      assertCrmSetupEligible: async () => undefined,
    },
    entitlements: ["crm"] as "crm"[],
    supportPermissions,
  };
}

export function webhookSupportRequest() {
  return {
    body: JSON.stringify({
      storeId: webhookSetupStoreId,
      tenantId: webhookSetupTenantId,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  };
}
