import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import {
  CrmConnectionSetupProviderError,
  type ComposioCrmChannel,
} from "../ports/crmConnectionSetupProvider.js";
import { toCrmChannelConnection } from "./channelConnectionModels.js";
import { CrmConnectionNotFoundError } from "../messaging/crmMessagingErrors.js";
import type { getComposioChannelOnboardingProvider } from "../services/CrmService/crmConnectionSetupSupport.js";
import {
  getCrmConnectionRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { logCrmServiceEvent } from "../services/CrmMessagingService/serviceSupport.js";
import type { AuthorizeComposioChannelConnectionInput } from "../services/CrmChannelConnectionService/composioChannelConnectionSetup.types.js";

export const composioConnectionPermission =
  "crm.messaging.connection.setup" as const;

export async function loadComposioSetupTarget(
  context: ServiceContext,
  input: AuthorizeComposioChannelConnectionInput,
  ports: CrmServicePorts,
) {
  assertPermission(context, composioConnectionPermission);
  assertEntitlement(context as never, "crm");
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Official CRM channel setup requires an authenticated store user.",
    );
  }
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.channel_connection.composio.setup.started", {
    connectionId: input.connectionId,
    operation: "connection_setup",
    broker: "composio",
  });
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (
    !connection ||
    connection.provider !== "meta_cloud" ||
    connection.broker !== "composio" ||
    (connection.channel !== "instagram" && connection.channel !== "whatsapp") ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new CrmConnectionNotFoundError(input.connectionId);
  }
  return connection as CrmConnection & {
    broker: "composio";
    channel: ComposioCrmChannel;
    provider: "meta_cloud";
  };
}

export async function assertConnectedAccountIsActive(
  provider: ReturnType<typeof getComposioChannelOnboardingProvider>,
  connectedAccountId: string,
  expectedChannel: ComposioCrmChannel,
) {
  const account = await provider.verifyConnectedAccount(connectedAccountId);
  const expectedToolkit = expectedChannel;
  if (
    account.connectedAccountId !== connectedAccountId ||
    account.status !== "active" ||
    account.toolkit?.toLowerCase() !== expectedToolkit
  ) {
    throw new CrmConnectionSetupProviderError(
      `Composio authorization does not match the expected ${expectedToolkit} account`,
      "provider_rejected",
    );
  }
}

export function readConnectedAccountId(connection: CrmConnection) {
  const composio = readRecord(connection.credentialsRef.composio);
  const connectedAccountId = readString(composio.connectedAccountId);
  if (!connectedAccountId) {
    throw new CrmConnectionSetupProviderError(
      "Composio authorization has not been started for this connection",
      "configuration_error",
    );
  }
  return connectedAccountId;
}

export function composioCredentialsRef(connectedAccountId: string) {
  return {
    composio: { connectedAccountId },
    env: { apiKey: "COMPOSIO_API_KEY" },
    mode: "composio",
  };
}

export function disconnectedConnection(connection: CrmConnection) {
  return toCrmChannelConnection(connection, {
    checkedAt: new Date(),
    connected: false,
    connectedPhone: null,
    providerStatus: "disconnected",
    smartphoneConnected: null,
  });
}

export function composioSetupAudit(
  action: string,
  connectionId: string,
  channel: ComposioCrmChannel,
) {
  return {
    action,
    category: "data_change" as const,
    entityId: connectionId,
    entityType: "crm_channel_connection",
    metadata: { connectionId },
    permission: composioConnectionPermission,
    summary:
      channel === "instagram"
        ? "Configured official Instagram connection"
        : "Configured official WhatsApp connection",
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
