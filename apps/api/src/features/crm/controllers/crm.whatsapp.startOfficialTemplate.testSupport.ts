import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import { createMemoryCrmRoutingRepositories } from "../adapters/memory/crmRoutingRepository.js";
import { createConfiguredZapiTestConnection } from "./crm.channelConnections.testSupport.js";

export function createOfficialTemplateConnection(
  provider: "meta_cloud" | "zapi",
  channel: "instagram" | "whatsapp",
  connectionId: string,
  storeId: StoreId,
  tenantId: TenantId,
): CrmConnection {
  if (provider === "zapi") {
    return createConfiguredZapiTestConnection({
      id: connectionId,
      storeId,
      tenantId,
    });
  }
  return {
    broker: "composio",
    channel,
    credentialsRef: {},
    displayName: channel,
    externalConnectionId: "sender-id",
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "meta_cloud",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

export function createOfficialTemplateRouting(
  provider: "meta_cloud" | "zapi",
  channel: "instagram" | "whatsapp",
  connectionId: string,
  storeId: StoreId,
  tenantId: TenantId,
) {
  return createMemoryCrmRoutingRepositories({
    connections: [
      {
        capabilities: {
          conversation_start: true,
          outbound: true,
          templates: true,
          text: true,
        },
        channel,
        connected: true,
        credentialBroker: provider === "zapi" ? "direct" : "composio",
        degraded: false,
        displayName: channel,
        errorCode: null,
        id: connectionId,
        provider,
        state: "active",
        storeId,
        tenantId,
      },
    ],
    policies: [
      {
        channel,
        defaultConnectionId: connectionId,
        externalBotConnectionId: null,
        externalBotMode: "disabled",
        id: `${channel}-default`,
        storeId,
        tenantId,
      },
    ],
  });
}
