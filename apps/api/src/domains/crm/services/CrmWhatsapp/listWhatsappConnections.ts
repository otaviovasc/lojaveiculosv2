import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappGateway,
  requireCrmWhatsappScope,
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
import {
  assertCredentialUpdateMatchesProvider,
  buildUpdatedConnectionCredentialsRef,
  buildUpdatedConnectionMetadata,
  type UpdateWhatsappConnectionInput,
} from "../../whatsapp/whatsappConnectionUpdates.js";

export type { WhatsappConnection } from "../../whatsapp/whatsappConnectionModels.js";
export type { UpdateWhatsappConnectionInput } from "../../whatsapp/whatsappConnectionUpdates.js";

const readPermission = "crm.whatsapp.list";
const updatePermission = "crm.whatsapp.connection.manage";
const credentialUpdatePermission = "crm.whatsapp.integrations.manage";

export async function listWhatsappConnections(
  context: ServiceContext,
  ports: CrmServicePorts,
): Promise<readonly WhatsappConnection[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmConnectionRepository(ports);
  logWhatsappServiceEvent(context, "crm.whatsapp.connections.list.started");
  const connections = await repository.listConnections({
    providers: ["zapi", "composio_whatsapp", "composio_instagram"],
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
  if (
    input.composioCredentials ||
    input.credentialsEnv ||
    input.instanceCredentials
  ) {
    assertPermission(context, credentialUpdatePermission);
  }
  const scope = requireCrmWhatsappScope(context);
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
      summary: "Updated CRM messaging connection",
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
      assertCredentialUpdateMatchesProvider(current, input);
      const metadata = buildUpdatedConnectionMetadata(current.metadata, input);
      const credentialsRef = buildUpdatedConnectionCredentialsRef(
        input,
        current,
      );
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
