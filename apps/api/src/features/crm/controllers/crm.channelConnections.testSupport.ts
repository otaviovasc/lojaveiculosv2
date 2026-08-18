import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmConnectionCredentialVault } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createZapiWebhookSetupIntent } from "../../../domains/crm/whatsapp/zapiWebhookSetupState.js";
import { crmChannelConnectionCapabilityFacts } from "../../../domains/crm/channelConnections/connectionCreation.js";

export const testZapiWebhookSecret = "webhook-secret";

export function createConfiguredZapiTestConnection(input: {
  id: string;
  overrides?: Partial<CrmConnection>;
  storeId: StoreId;
  tenantId: TenantId;
}): CrmConnection {
  const overrides = input.overrides ?? {};
  return {
    credentialsRef: {
      stored: { webhookSecret: `sealed:${testZapiWebhookSecret}` },
    },
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: input.id,
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: input.storeId,
    tenantId: input.tenantId,
    webhookUrl: null,
    ...overrides,
    broker: overrides.broker ?? "direct",
    channel: overrides.channel ?? "whatsapp",
    metadata: configuredMetadata(input.id, overrides.metadata),
  };
}

export function createTestCrmConnectionCredentialVault(): CrmConnectionCredentialVault {
  return {
    open: async ({ sealed }) => sealed.replace(/^sealed:/u, ""),
    seal: async ({ plaintext }) => `sealed:${plaintext}`,
  };
}

export function withTestZapiWebhookToken(headers: Record<string, string> = {}) {
  return {
    ...headers,
    "x-crm-webhook-token": testZapiWebhookSecret,
  };
}

function configuredMetadata(
  connectionId: string,
  metadata: CrmConnection["metadata"] | undefined,
): CrmConnection["metadata"] {
  return {
    ...metadata,
    capabilities: crmChannelConnectionCapabilityFacts({
      broker: "direct",
      channel: "whatsapp",
      provider: "zapi",
    }),
    connected: true,
    degraded: false,
    errorCode: null,
    webhookSetup: {
      ...createZapiWebhookSetupIntent(connectionId),
      configuredAt: "2026-08-01T00:00:00.000Z",
      status: "configured",
    },
  };
}
