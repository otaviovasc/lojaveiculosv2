import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import {
  createZapiWebhookSetupIntent,
  withZapiWebhookSetupState,
} from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";

export const storeId = "25000000-0000-4000-8000-000000000001" as StoreId;
export const tenantId = "25000000-0000-4000-8000-000000000002" as TenantId;
export const connectionId = "24000000-0000-4000-8000-000000000101";
export const customerStoreId = "store_1" as StoreId;
export const customerTenantId = "tenant_1" as TenantId;

export function createConnection(
  provider: "meta_cloud" | "zapi",
  credentialsRef: Record<string, unknown> = {},
): CrmConnection {
  return {
    broker: provider === "zapi" ? "direct" : "composio",
    channel: "whatsapp",
    credentialsRef,
    displayName: "Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata:
      provider === "zapi"
        ? withZapiWebhookSetupState(
            {},
            {
              ...createZapiWebhookSetupIntent(connectionId),
              configuredAt: "2026-08-09T12:00:00.000Z",
              status: "configured",
            },
          )
        : {},
    phone: null,
    provider,
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}
