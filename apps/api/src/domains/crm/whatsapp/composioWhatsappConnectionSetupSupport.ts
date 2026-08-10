import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import { CrmConnectionSetupProviderError } from "../ports/crmConnectionSetupProvider.js";
import { toWhatsappConnection } from "./whatsappConnectionModels.js";
import { WhatsappConnectionNotFoundError } from "./whatsappSendErrors.js";
import type { getComposioWhatsappOnboardingProvider } from "../services/CrmService/crmConnectionSetupSupport.js";
import {
  getCrmConnectionRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { logWhatsappServiceEvent } from "../services/CrmWhatsapp/serviceSupport.js";
import type { AuthorizeComposioWhatsappInput } from "../services/CrmWhatsapp/composioWhatsappConnectionSetup.types.js";

export const composioConnectionPermission =
  "crm.whatsapp.connection.manage" as const;

export async function loadComposioSetupTarget(
  context: ServiceContext,
  input: AuthorizeComposioWhatsappInput,
  ports: CrmServicePorts,
) {
  assertPermission(context, composioConnectionPermission);
  assertPermission(context, "crm.whatsapp.integrations.manage");
  assertEntitlement(context as never, "crm");
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Official WhatsApp setup requires an authenticated store user.",
    );
  }
  const scope = requireCrmWhatsappScope(context);
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.connection.composio.setup.started",
    {
      connectionId: input.connectionId,
      operation: "connection_setup",
      provider: "composio",
    },
  );
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (
    !connection ||
    connection.provider !== "composio_whatsapp" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(input.connectionId);
  }
  return connection;
}

export async function assertConnectedAccountIsActive(
  provider: ReturnType<typeof getComposioWhatsappOnboardingProvider>,
  connectedAccountId: string,
) {
  const account = await provider.verifyConnectedAccount(connectedAccountId);
  if (
    account.connectedAccountId !== connectedAccountId ||
    account.status !== "active" ||
    !account.toolkit?.toLowerCase().includes("whatsapp")
  ) {
    throw new CrmConnectionSetupProviderError(
      "Composio authorization does not match the expected WhatsApp account",
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
  return toWhatsappConnection(connection, {
    checkedAt: new Date(),
    connected: false,
    connectedPhone: null,
    providerStatus: "disconnected",
    smartphoneConnected: null,
  });
}

export function composioSetupAudit(action: string, connectionId: string) {
  return {
    action,
    category: "data_change" as const,
    entityId: connectionId,
    entityType: "crm_whatsapp_connection",
    metadata: { connectionId },
    permission: composioConnectionPermission,
    summary: "Configured official WhatsApp connection",
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
