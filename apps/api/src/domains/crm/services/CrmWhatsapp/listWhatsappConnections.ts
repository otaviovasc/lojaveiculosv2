import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmConnection,
  CrmConnectionConfiguredStatus,
} from "../../ports/crmConnectionRepository.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappGateway,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  toWhatsappConnection,
  type WhatsappConnection,
  type WhatsappConnectionLiveStatus,
} from "../../whatsapp/whatsappConnectionModels.js";

export type { WhatsappConnection } from "../../whatsapp/whatsappConnectionModels.js";

const readPermission = "crm.whatsapp.list";
const updatePermission = "crm.whatsapp.connection.manage";

export type UpdateWhatsappConnectionInput = {
  catalogPhone?: string | null;
  connectedPhone?: string | null;
  connectionId: string;
  credentialsEnv?: {
    apiBaseUrl: string;
    clientToken: string;
    instanceId: string;
    instanceToken: string;
  };
  displayName?: string;
  externalConnectionId?: string | null;
  externalInstanceId?: string | null;
  instanceCredentials?: {
    instanceId: string;
    instanceToken: string;
  };
  phone?: string | null;
  purpose?: string | null;
  status?: CrmConnectionConfiguredStatus;
  webhookUrl?: string | null;
};

export async function listWhatsappConnections(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly WhatsappConnection[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmScope(context);
  const repository = getCrmConnectionRepository(ports);
  logWhatsappServiceEvent(context, "crm.whatsapp.connections.list.started");
  const connections = await repository.listConnections({
    providers: ["zapi"],
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });

  const result = await Promise.all(
    connections.map(async (connection) =>
      toWhatsappConnection(
        connection,
        await readConnectionLiveStatus(connection, ports),
      ),
    ),
  );
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.connections.list",
    category: "data_access",
    metadata: { connectionCount: result.length },
    permission: readPermission,
    summary: "Listed CRM WhatsApp connections",
  });
  return result;
}

export async function updateWhatsappConnection(
  context: ServiceContext,
  input: UpdateWhatsappConnectionInput,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
  assertPermission(context, updatePermission);
  const scope = requireCrmScope(context);
  logWhatsappServiceEvent(context, "crm.whatsapp.connection.update.started", {
    connectionId: input.connectionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.connection.update",
      category: "data_change",
      entityId: input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: {
        connectionId: input.connectionId,
        updates: Object.keys(input)
          .filter((key) => key !== "connectionId")
          .join(","),
      },
      permission: updatePermission,
      summary: "Updated CRM WhatsApp ZAPI connection",
    },
    async () => {
      const repository = getCrmConnectionRepository(ports);
      const current = await repository.findConnectionById(input.connectionId);
      if (
        !current ||
        current.storeId !== scope.storeId ||
        current.tenantId !== scope.tenantId
      ) {
        throw new WhatsappConnectionNotFoundError(input.connectionId);
      }
      const metadata = buildUpdatedMetadata(current.metadata, input);
      const credentialsRef = buildUpdatedCredentialsRef(input, current);
      const updated = await repository.updateConnection({
        ...(credentialsRef ? { credentialsRef } : {}),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.externalConnectionId !== undefined
          ? { externalConnectionId: input.externalConnectionId }
          : {}),
        ...(input.externalInstanceId !== undefined
          ? { externalInstanceId: input.externalInstanceId }
          : input.instanceCredentials
            ? { externalInstanceId: input.instanceCredentials.instanceId }
            : {}),
        ...(metadata ? { metadata } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.webhookUrl !== undefined
          ? { webhookUrl: input.webhookUrl }
          : {}),
        connectionId: current.id,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!updated)
        throw new WhatsappConnectionNotFoundError(input.connectionId);
      return toWhatsappConnection(
        updated,
        await readConnectionLiveStatus(updated, ports),
      );
    },
  );
}

async function readConnectionLiveStatus(
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<WhatsappConnectionLiveStatus> {
  return getCrmWhatsappGateway(ports)
    .getConnectionStatus(connection)
    .catch((error: unknown): WhatsappConnectionLiveStatus => ({
      checkedAt: new Date(),
      connected: null,
      connectedPhone: null,
      errorMessage:
        error instanceof Error ? error.message : "Unknown provider error.",
      providerStatus: "error",
      smartphoneConnected: null,
    }));
}

function buildUpdatedMetadata(
  current: Record<string, unknown>,
  input: UpdateWhatsappConnectionInput,
) {
  const next = { ...current };
  let changed = false;
  for (const key of ["catalogPhone", "connectedPhone", "purpose"] as const) {
    if (input[key] !== undefined) {
      next[key] = input[key];
      changed = true;
    }
  }
  return changed ? next : null;
}

function toCredentialsRef(
  input: NonNullable<UpdateWhatsappConnectionInput["credentialsEnv"]>,
) {
  return {
    env: {
      apiBaseUrl: input.apiBaseUrl,
      clientToken: input.clientToken,
      instanceId: input.instanceId,
      instanceToken: input.instanceToken,
    },
    mode: "env",
  };
}

function buildUpdatedCredentialsRef(
  input: UpdateWhatsappConnectionInput,
  current: CrmConnection,
) {
  if (input.credentialsEnv) return toCredentialsRef(input.credentialsEnv);
  if (!input.instanceCredentials) return null;
  return toStoredCredentialsRef(input.instanceCredentials, current);
}

function toStoredCredentialsRef(
  input: NonNullable<UpdateWhatsappConnectionInput["instanceCredentials"]>,
  current: CrmConnection,
) {
  const currentEnv =
    current.credentialsRef.env &&
    typeof current.credentialsRef.env === "object" &&
    !Array.isArray(current.credentialsRef.env)
      ? (current.credentialsRef.env as Record<string, unknown>)
      : {};
  return {
    env: {
      ...(typeof currentEnv.apiBaseUrl === "string"
        ? { apiBaseUrl: currentEnv.apiBaseUrl }
        : {}),
      ...(typeof currentEnv.clientToken === "string"
        ? { clientToken: currentEnv.clientToken }
        : {}),
    },
    mode: "stored",
    stored: {
      instanceId: input.instanceId,
      instanceToken: input.instanceToken,
    },
  };
}
