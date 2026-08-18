import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import { type WhatsappConnection } from "../../whatsapp/whatsappConnectionModels.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  getComposioWhatsappOnboardingProvider,
  requireComposioInstagramOnboardingProvider,
} from "../CrmService/crmConnectionSetupSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import type {
  AuthorizeComposioWhatsappInput,
  CompleteComposioWhatsappResult,
  SelectComposioWhatsappSenderInput,
} from "./composioWhatsappConnectionSetup.types.js";
import {
  assertConnectedAccountIsActive,
  composioCredentialsRef,
  composioSetupAudit,
  disconnectedConnection,
  loadComposioSetupTarget,
  readConnectedAccountId,
} from "../../whatsapp/composioWhatsappConnectionSetupSupport.js";
import { selectComposioInstagramSender } from "./composioInstagramConnectionSelection.js";
import { selectComposioWhatsappPhone } from "./composioWhatsappConnectionSelection.js";
export type {
  AuthorizeComposioWhatsappInput,
  CompleteComposioWhatsappResult,
  SelectComposioWhatsappSenderInput,
} from "./composioWhatsappConnectionSetup.types.js";

export async function authorizeComposioWhatsappConnection(
  context: ServiceContext,
  input: AuthorizeComposioWhatsappInput,
  ports: CrmServicePorts,
) {
  assertComposioSetupPermissions(context);
  const connection = await loadComposioSetupTarget(context, input, ports);
  return recordWhatsappServiceMutation(
    context,
    composioSetupAudit(
      "crm.channel_connection.composio.authorize",
      connection.id,
      connection.provider,
    ),
    async () => {
      const provider = getComposioWhatsappOnboardingProvider(ports);
      const link = await provider.createConnectLink({
        alias: `store:${connection.storeId}`,
        provider: connection.provider,
        userId: `${connection.tenantId}:${connection.storeId}`,
      });
      logWhatsappServiceEvent(
        context,
        "crm.provider.composio.operation.completed",
        {
          connectionId: connection.id,
          operation: "create_connect_link",
          provider: "composio",
        },
      );
      const updated = await getCrmConnectionRepository(ports).updateConnection({
        connectionId: connection.id,
        credentialsRef: composioCredentialsRef(link.connectedAccountId),
        externalConnectionId: null,
        metadata: resetComposioConnectionMetadata(connection.metadata),
        phone: null,
        status: "sandbox",
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      if (!updated) throw new WhatsappConnectionNotFoundError(connection.id);
      return { expiresAt: link.expiresAt, redirectUrl: link.redirectUrl };
    },
  );
}

function resetComposioConnectionMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const reset = { ...metadata };
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

export async function completeComposioWhatsappConnection(
  context: ServiceContext,
  input: AuthorizeComposioWhatsappInput,
  ports: CrmServicePorts,
): Promise<CompleteComposioWhatsappResult> {
  assertComposioSetupPermissions(context);
  const connection = await loadComposioSetupTarget(context, input, ports);
  return recordWhatsappServiceMutation(
    context,
    composioSetupAudit(
      "crm.channel_connection.composio.complete",
      connection.id,
      connection.provider,
    ),
    async () => {
      const provider = getComposioWhatsappOnboardingProvider(ports);
      const connectedAccountId = readConnectedAccountId(connection);
      await assertConnectedAccountIsActive(
        provider,
        connectedAccountId,
        connection.provider,
      );
      if (connection.provider === "composio_instagram") {
        const instagramProvider =
          requireComposioInstagramOnboardingProvider(provider);
        const resources =
          await instagramProvider.discoverInstagramResources(
            connectedAccountId,
          );
        logWhatsappServiceEvent(
          context,
          "crm.provider.composio.operation.completed",
          {
            connectionId: connection.id,
            operation: "discover_instagram_resources",
            provider: "composio",
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
      logWhatsappServiceEvent(
        context,
        "crm.provider.composio.operation.completed",
        {
          businessAccountCount: resources.businessAccounts.length,
          connectionId: connection.id,
          operation: "discover_whatsapp_resources",
          provider: "composio",
          senderCount: resources.phones.length,
        },
      );
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

export async function selectComposioWhatsappSender(
  context: ServiceContext,
  input: SelectComposioWhatsappSenderInput,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
  assertComposioSetupPermissions(context);
  const connection = await loadComposioSetupTarget(context, input, ports);
  return recordWhatsappServiceMutation(
    context,
    composioSetupAudit(
      "crm.channel_connection.composio.select_sender",
      connection.id,
      connection.provider,
    ),
    async () => {
      const provider = getComposioWhatsappOnboardingProvider(ports);
      const connectedAccountId = readConnectedAccountId(connection);
      await assertConnectedAccountIsActive(
        provider,
        connectedAccountId,
        connection.provider,
      );
      if (connection.provider === "composio_instagram") {
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
