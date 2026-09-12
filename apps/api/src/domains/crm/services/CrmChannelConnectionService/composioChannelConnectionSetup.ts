import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { type CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";
import { CrmConnectionNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  getComposioChannelOnboardingProvider,
  requireComposioInstagramOnboardingProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import type {
  AuthorizeComposioChannelConnectionInput,
  CompleteComposioChannelConnectionResult,
  SelectComposioChannelSenderInput,
} from "./composioChannelConnectionSetup.types.js";
import {
  assertConnectedAccountIsActive,
  composioCredentialsRef,
  composioSetupAudit,
  disconnectedConnection,
  loadComposioSetupTarget,
  readConnectedAccountId,
} from "../../channelConnections/composioChannelConnectionSetupSupport.js";
import { selectComposioInstagramSender } from "./composioInstagramConnectionSelection.js";
import { selectComposioWhatsappPhone } from "../CrmWhatsappService/composioWhatsappConnectionSelection.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";
export type {
  AuthorizeComposioChannelConnectionInput,
  CompleteComposioChannelConnectionResult,
  SelectComposioChannelSenderInput,
} from "./composioChannelConnectionSetup.types.js";

export async function authorizeComposioCrmChannelConnection(
  context: ServiceContext,
  input: AuthorizeComposioChannelConnectionInput,
  ports: CrmServicePorts,
) {
  assertComposioSetupPermissions(context);
  const connection = await loadComposioSetupTarget(context, input, ports);
  return recordCrmServiceMutation(
    context,
    composioSetupAudit(
      "crm.channel_connection.composio.authorize",
      connection.id,
      connection.channel,
    ),
    async () => {
      const provider = getComposioChannelOnboardingProvider(ports);
      const link = await provider.createConnectLink({
        alias: `store:${connection.storeId}`,
        channel: connection.channel,
        userId: `${connection.tenantId}:${connection.storeId}`,
      });
      logCrmServiceEvent(context, "crm.provider.composio.operation.completed", {
        connectionId: connection.id,
        operation: "create_connect_link",
        broker: "composio",
      });
      const updated = await getCrmConnectionRepository(ports).updateConnection({
        connectionId: connection.id,
        credentialsRef: composioCredentialsRef(link.connectedAccountId),
        externalConnectionId: null,
        metadata: resetComposioConnectionMetadata(connection),
        phone: null,
        status: "sandbox",
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      if (!updated) throw new CrmConnectionNotFoundError(connection.id);
      return { expiresAt: link.expiresAt, redirectUrl: link.redirectUrl };
    },
  );
}

function resetComposioConnectionMetadata(
  connection: Pick<
    CrmConnection,
    "broker" | "channel" | "metadata" | "provider"
  >,
): Record<string, unknown> {
  if (
    connection.broker !== "composio" ||
    connection.provider !== "meta_cloud" ||
    (connection.channel !== "instagram" && connection.channel !== "whatsapp")
  ) {
    throw new Error("Composio setup target has an invalid canonical identity.");
  }
  const reset: Record<string, unknown> = {
    ...connection.metadata,
    capabilities: crmChannelConnectionCapabilityFacts({
      broker: connection.broker,
      channel: connection.channel,
      provider: connection.provider,
    }),
    connected: false,
    degraded: false,
    errorCode: null,
  };
  for (const key of [
    "composioBusinessAccountId",
    "composioInstagramAccountId",
    "composioInstagramLoginMode",
    "composioPageId",
    "composioSubscriptionEvidence",
    "connectedPhone",
    "providerConnected",
  ]) {
    delete reset[key];
  }
  return reset;
}

export async function completeComposioCrmChannelConnection(
  context: ServiceContext,
  input: AuthorizeComposioChannelConnectionInput,
  ports: CrmServicePorts,
): Promise<CompleteComposioChannelConnectionResult> {
  assertComposioSetupPermissions(context);
  const connection = await loadComposioSetupTarget(context, input, ports);
  return recordCrmServiceMutation(
    context,
    composioSetupAudit(
      "crm.channel_connection.composio.complete",
      connection.id,
      connection.channel,
    ),
    async () => {
      const provider = getComposioChannelOnboardingProvider(ports);
      const connectedAccountId = readConnectedAccountId(connection);
      await assertConnectedAccountIsActive(
        provider,
        connectedAccountId,
        connection.channel,
      );
      if (connection.channel === "instagram") {
        const instagramProvider =
          requireComposioInstagramOnboardingProvider(provider);
        const resources =
          await instagramProvider.discoverInstagramResources(
            connectedAccountId,
          );
        logCrmServiceEvent(
          context,
          "crm.provider.composio.operation.completed",
          {
            connectionId: connection.id,
            operation: "discover_instagram_resources",
            broker: "composio",
            senderCount: resources.senders.length,
          },
        );
        return {
          connection: disconnectedConnection(connection),
          nextAction: resources.senders.length ? "select_sender" : null,
          senders: resources.senders.map((sender) => ({
            accountType: sender.accountType,
            displayName: sender.displayName,
            loginMode: sender.loginMode,
            pageId: sender.pageId,
            phone: null,
            senderId: sender.senderId,
            subscriptionTargetId: sender.subscriptionTargetId,
            username: sender.username,
          })),
        };
      }
      const resources =
        await provider.discoverWhatsappResources(connectedAccountId);
      logCrmServiceEvent(context, "crm.provider.composio.operation.completed", {
        businessAccountCount: resources.businessAccounts.length,
        connectionId: connection.id,
        operation: "discover_whatsapp_resources",
        broker: "composio",
        senderCount: resources.phones.length,
      });
      const senders = resources.phones.map((phone) => ({
        accountType: null,
        displayName: phone.displayName,
        loginMode: null,
        pageId: null,
        phone: phone.phone,
        senderId: phone.id,
        subscriptionTargetId: null,
        username: null,
      }));
      return {
        connection: disconnectedConnection(connection),
        nextAction: senders.length ? "select_sender" : null,
        senders,
      };
    },
  );
}

export async function selectComposioChannelSender(
  context: ServiceContext,
  input: SelectComposioChannelSenderInput,
  ports: CrmServicePorts,
): Promise<CrmChannelConnection> {
  assertComposioSetupPermissions(context);
  const connection = await loadComposioSetupTarget(context, input, ports);
  return recordCrmServiceMutation(
    context,
    composioSetupAudit(
      "crm.channel_connection.composio.select_sender",
      connection.id,
      connection.channel,
    ),
    async () => {
      const provider = getComposioChannelOnboardingProvider(ports);
      const connectedAccountId = readConnectedAccountId(connection);
      await assertConnectedAccountIsActive(
        provider,
        connectedAccountId,
        connection.channel,
      );
      if (connection.channel === "instagram") {
        return selectComposioInstagramSender(
          context,
          connection,
          connectedAccountId,
          input.senderId,
          requireComposioInstagramOnboardingProvider(provider),
          ports,
        );
      }
      return selectComposioWhatsappPhone(
        context,
        connection,
        connectedAccountId,
        input.senderId,
        provider,
        ports,
      );
    },
  );
}

function assertComposioSetupPermissions(context: ServiceContext) {
  assertPermission(context, "crm.messaging.connection.setup");
}
