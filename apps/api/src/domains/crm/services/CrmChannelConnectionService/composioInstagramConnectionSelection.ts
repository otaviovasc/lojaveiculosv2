import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  composioInstagramWebhookFields,
  CrmConnectionSetupProviderError,
  type ComposioInstagramOnboardingProvider,
  type ComposioInstagramSender,
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

export async function selectComposioInstagramSender(
  context: ServiceContext,
  connection: CrmConnection,
  connectedAccountId: string,
  senderId: string,
  provider: ComposioInstagramOnboardingProvider,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  const resources =
    await provider.discoverInstagramResources(connectedAccountId);
  const sender = resources.senders.find((item) => item.senderId === senderId);
  if (!sender) {
    throw new CrmConnectionSetupProviderError(
      "The selected Instagram professional account is not available",
      "provider_rejected",
    );
  }
  if (hasPersistedSubscriptionEvidence(connection, sender)) {
    return readyConnection(context, connection, ports);
  }
  const evidence = await provider.subscribeInstagramApp({
    connectedAccountId,
    senderId: sender.senderId,
    subscriptionTargetId: sender.subscriptionTargetId,
  });
  assertSubscriptionEvidence(sender, evidence);
  logCrmServiceEvent(context, "crm.provider.composio.operation.completed", {
    connectionId: connection.id,
    operation: "subscribe_selected_instagram_app",
    broker: "composio",
  });
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    externalConnectionId: sender.senderId,
    metadata: {
      ...connection.metadata,
      capabilities: crmChannelConnectionCapabilityFacts({
        broker: "composio",
        channel: "instagram",
        provider: "meta_cloud",
      }),
      composioInstagramAccountId: sender.senderId,
      composioInstagramLoginMode: sender.loginMode,
      composioPageId: sender.pageId,
      composioSubscriptionEvidence: {
        fields: [...evidence.fields],
        providerConfirmed: true,
        targetId: evidence.targetId,
      },
      connectedPhone: null,
      connected: true,
      degraded: false,
      errorCode: null,
      providerConnected: true,
    },
    phone: null,
    status: "active",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new CrmConnectionNotFoundError(connection.id);
  return readyConnection(context, updated, ports);
}

function assertSubscriptionEvidence(
  sender: ComposioInstagramSender,
  evidence: Awaited<
    ReturnType<ComposioInstagramOnboardingProvider["subscribeInstagramApp"]>
  >,
) {
  const required = composioInstagramWebhookFields[sender.loginMode];
  const actual = new Set(evidence.fields);
  if (
    evidence.targetId !== sender.subscriptionTargetId ||
    evidence.subscribed !== true ||
    required.some((field) => !actual.has(field))
  ) {
    throw new CrmConnectionSetupProviderError(
      "Meta did not confirm the required Instagram webhook subscription",
      "provider_outcome_indeterminate",
    );
  }
}

function hasPersistedSubscriptionEvidence(
  connection: CrmConnection,
  sender: ComposioInstagramSender,
) {
  const evidence = readRecord(connection.metadata.composioSubscriptionEvidence);
  const fields = Array.isArray(evidence.fields) ? evidence.fields : [];
  return (
    connection.status === "active" &&
    connection.externalConnectionId === sender.senderId &&
    evidence.providerConfirmed === true &&
    evidence.targetId === sender.subscriptionTargetId &&
    composioInstagramWebhookFields[sender.loginMode].every((field) =>
      fields.includes(field),
    )
  );
}

async function readyConnection(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
) {
  const result = toCrmChannelConnection(connection, {
    checkedAt: new Date(),
    connected: true,
    connectedPhone: null,
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
      { channel: "instagram", connectionId: result.id },
      ports,
    );
  }
  return result;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
