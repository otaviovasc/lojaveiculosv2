import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  CrmConnectionSetupProviderError,
  type ComposioCrmOnboardingProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import {
  toCrmChannelConnection,
  type CrmChannelConnection,
} from "../../channelConnections/channelConnectionModels.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { persistInitialReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";
import { logCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";

export async function selectComposioWhatsappPhone(
  context: ServiceContext,
  connection: CrmConnection,
  connectedAccountId: string,
  senderId: string,
  provider: ComposioCrmOnboardingProvider,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  const resources =
    await provider.discoverWhatsappResources(connectedAccountId);
  const sender = resources.phones.find((phone) => phone.id === senderId);
  if (!sender) {
    throw new CrmConnectionSetupProviderError(
      "The selected WhatsApp sender is not available for this account",
      "provider_rejected",
    );
  }
  if (
    connection.status === "active" &&
    connection.externalConnectionId === sender.id &&
    connection.metadata.composioBusinessAccountId === sender.businessAccountId
  ) {
    return readyCrmChannelConnection(context, connection, ports);
  }
  await provider.subscribeWhatsappApp({
    businessAccountId: sender.businessAccountId,
    connectedAccountId,
  });
  logCrmServiceEvent(context, "crm.provider.composio.operation.completed", {
    connectionId: connection.id,
    operation: "subscribe_selected_whatsapp_app",
    broker: "composio",
  });
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    externalConnectionId: sender.id,
    metadata: {
      ...connection.metadata,
      capabilities: crmChannelConnectionCapabilityFacts({
        broker: "composio",
        channel: "whatsapp",
        provider: "meta_cloud",
      }),
      composioBusinessAccountId: sender.businessAccountId,
      connectedPhone: sender.phone,
      connected: true,
      degraded: false,
      errorCode: null,
      providerConnected: true,
    },
    phone: sender.phone,
    status: "active",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new CrmConnectionNotFoundError(connection.id);
  return readyCrmChannelConnection(context, updated, ports);
}

async function readyCrmChannelConnection(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
) {
  const result = toCrmChannelConnection(connection, {
    checkedAt: new Date(),
    connected: true,
    connectedPhone: connection.phone,
    providerStatus: "connected",
    smartphoneConnected: null,
  });
  if (
    result.ready &&
    ports.crmRoutingConnectionRepository &&
    ports.crmRoutingPolicyRepository
  ) {
    await persistInitialReadyChannelDefault(
      context,
      { channel: "whatsapp", connectionId: result.id },
      ports,
    );
  }
  return result;
}
