import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import { CrmConnectionSetupProviderError } from "../../ports/crmConnectionSetupProvider.js";
import {
  toWhatsappConnection,
  type WhatsappConnection,
} from "../../whatsapp/whatsappConnectionModels.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getComposioWhatsappOnboardingProvider } from "../CrmService/crmConnectionSetupSupport.js";
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
import { ensureFirstReadyChannelDefault } from "../CrmRoutingService/ensureFirstReadyChannelDefault.js";
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
      "crm.whatsapp.connection.composio.authorize",
      connection.id,
    ),
    async () => {
      const provider = getComposioWhatsappOnboardingProvider(ports);
      const link = await provider.createConnectLink({
        alias: `store:${connection.storeId}`,
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
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      if (!updated) throw new WhatsappConnectionNotFoundError(connection.id);
      return { expiresAt: link.expiresAt, redirectUrl: link.redirectUrl };
    },
  );
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
      "crm.whatsapp.connection.composio.complete",
      connection.id,
    ),
    async () => {
      const provider = getComposioWhatsappOnboardingProvider(ports);
      const connectedAccountId = readConnectedAccountId(connection);
      await assertConnectedAccountIsActive(provider, connectedAccountId);
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
        displayName: phone.displayName,
        phone: phone.phone,
        senderId: phone.id,
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
      "crm.whatsapp.connection.composio.select_sender",
      connection.id,
    ),
    async () => {
      const provider = getComposioWhatsappOnboardingProvider(ports);
      const connectedAccountId = readConnectedAccountId(connection);
      await assertConnectedAccountIsActive(provider, connectedAccountId);
      const resources =
        await provider.discoverWhatsappResources(connectedAccountId);
      const sender = resources.phones.find(
        (phone) => phone.id === input.senderId,
      );
      if (!sender) {
        throw new CrmConnectionSetupProviderError(
          "The selected WhatsApp sender is not available for this account",
          "provider_rejected",
        );
      }
      if (
        connection.status === "active" &&
        connection.externalConnectionId === sender.id &&
        connection.metadata.composioBusinessAccountId ===
          sender.businessAccountId
      ) {
        const result = toWhatsappConnection(connection, {
          checkedAt: new Date(),
          connected: true,
          connectedPhone: connection.phone,
          providerStatus: "connected",
          smartphoneConnected: null,
        });
        await persistDefaultForReadyConnection(context, result, ports);
        return result;
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
        },
        phone: sender.phone,
        status: "active",
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
      if (!updated) throw new WhatsappConnectionNotFoundError(connection.id);
      const result = toWhatsappConnection(updated, {
        checkedAt: new Date(),
        connected: true,
        connectedPhone: sender.phone,
        providerStatus: "connected",
        smartphoneConnected: null,
      });
      await persistDefaultForReadyConnection(context, result, ports);
      return result;
    },
  );
}

async function persistDefaultForReadyConnection(
  context: ServiceContext,
  connection: WhatsappConnection,
  ports: CrmServicePorts,
) {
  if (
    !connection.ready ||
    !context.permissions.includes("crm.routing.default.manage") ||
    !ports.crmRoutingConnectionRepository ||
    !ports.crmRoutingPolicyRepository
  )
    return;
  await ensureFirstReadyChannelDefault(
    context,
    {
      channel: connection.channel ?? "whatsapp",
      connectionId: connection.id,
    },
    ports,
  );
}

function assertComposioSetupPermissions(context: ServiceContext) {
  assertPermission(context, "crm.messaging.connection.setup");
}
