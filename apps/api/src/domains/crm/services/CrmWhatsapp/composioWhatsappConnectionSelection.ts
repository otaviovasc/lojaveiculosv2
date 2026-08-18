import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  CrmConnectionSetupProviderError,
  type ComposioCrmOnboardingProvider,
} from "../../ports/crmConnectionSetupProvider.js";
import {
  toWhatsappConnection,
  type WhatsappConnection,
} from "../../whatsapp/whatsappConnectionModels.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { ensureFirstReadyChannelDefault } from "../CrmRoutingService/ensureFirstReadyChannelDefault.js";
import { logWhatsappServiceEvent } from "./serviceSupport.js";

export async function selectComposioWhatsappPhone(
  context: ServiceContext,
  connection: CrmConnection,
  connectedAccountId: string,
  senderId: string,
  provider: ComposioCrmOnboardingProvider,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
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
    return readyWhatsappConnection(context, connection, ports);
  }
  await provider.subscribeWhatsappApp({
    businessAccountId: sender.businessAccountId,
    connectedAccountId,
  });
  logWhatsappServiceEvent(
    context,
    "crm.provider.composio.operation.completed",
    {
      connectionId: connection.id,
      operation: "subscribe_selected_whatsapp_app",
      provider: "composio",
    },
  );
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    externalConnectionId: sender.id,
    metadata: {
      ...connection.metadata,
      composioBusinessAccountId: sender.businessAccountId,
      connectedPhone: sender.phone,
      providerConnected: true,
    },
    phone: sender.phone,
    status: "active",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new WhatsappConnectionNotFoundError(connection.id);
  return readyWhatsappConnection(context, updated, ports);
}

async function readyWhatsappConnection(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
) {
  const result = toWhatsappConnection(connection, {
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
    await ensureFirstReadyChannelDefault(
      context,
      { channel: "whatsapp", connectionId: result.id },
      ports,
    );
  }
  return result;
}
