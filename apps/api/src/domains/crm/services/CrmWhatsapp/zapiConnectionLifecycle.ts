import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  toWhatsappConnection,
  type WhatsappConnection,
} from "../../whatsapp/whatsappConnectionModels.js";
import { WhatsappConnectionNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmConnectionRepository,
  getCrmWhatsappGateway,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const permission = "crm.messaging.connection.setup" as const;

export type ZapiConnectionLifecycleInput = { connectionId: string };

export async function disconnectZapiConnection(
  context: ServiceContext,
  input: ZapiConnectionLifecycleInput,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
  return recordWhatsappServiceMutation(
    context,
    lifecycleAudit("disconnect", input.connectionId),
    async () => {
      const connection = await loadLifecycleTarget(context, input, ports);
      await getCrmWhatsappGateway(ports).disconnectConnection(connection);
      const checkedAt = new Date();
      const updated = await persistProviderStatus(
        connection,
        {
          connected: false,
          connectedPhone: null,
          providerStatus: "disconnected",
        },
        checkedAt,
        ports,
      );
      logWhatsappServiceEvent(
        context,
        "crm.provider.zapi.disconnect.completed",
        { connectionId: connection.id, provider: "zapi" },
      );
      return toWhatsappConnection(updated, {
        checkedAt,
        connected: false,
        connectedPhone: null,
        providerStatus: "disconnected",
        smartphoneConnected: false,
      });
    },
  );
}

export async function refreshZapiConnectionStatus(
  context: ServiceContext,
  input: ZapiConnectionLifecycleInput,
  ports: CrmServicePorts,
): Promise<WhatsappConnection> {
  return recordWhatsappServiceMutation(
    context,
    lifecycleAudit("refresh_status", input.connectionId),
    async () => {
      const connection = await loadLifecycleTarget(context, input, ports);
      const live =
        await getCrmWhatsappGateway(ports).getConnectionStatus(connection);
      const updated = await persistProviderStatus(
        connection,
        live,
        live.checkedAt,
        ports,
      );
      return toWhatsappConnection(updated, live);
    },
  );
}

async function loadLifecycleTarget(
  context: ServiceContext,
  input: ZapiConnectionLifecycleInput,
  ports: CrmServicePorts,
) {
  assertPermission(context, permission);
  if (context.actor.kind !== "user") {
    throw new AuthorizationError(
      "Z-API connection management requires an authenticated store user.",
    );
  }
  const scope = requireCrmWhatsappScope(context);
  assertEntitlement(context as never, "crm_zapi");
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (
    !connection ||
    connection.provider !== "zapi" ||
    connection.status === "archived" ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    throw new WhatsappConnectionNotFoundError(input.connectionId);
  }
  return connection;
}

async function persistProviderStatus(
  connection: CrmConnection,
  live: {
    connected: boolean;
    connectedPhone: string | null;
    providerStatus: "connected" | "disconnected" | "unknown";
  },
  checkedAt: Date,
  ports: CrmServicePorts,
) {
  const nextStatus =
    connection.status === "paused"
      ? "paused"
      : live.providerStatus === "connected"
        ? "active"
        : live.providerStatus === "disconnected"
          ? "disconnected"
          : connection.status;
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    metadata: {
      ...connection.metadata,
      lastProviderStatusCheckedAt: checkedAt.toISOString(),
      providerConnected: live.connected,
    },
    ...(live.connectedPhone ? { phone: live.connectedPhone } : {}),
    status: nextStatus,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new WhatsappConnectionNotFoundError(connection.id);
  return updated;
}

function lifecycleAudit(
  operation: "disconnect" | "refresh_status",
  connectionId: string,
) {
  return {
    action: `crm.whatsapp.connection.zapi.${operation}`,
    category: "data_change" as const,
    entityId: connectionId,
    entityType: "crm_whatsapp_connection",
    metadata: { connectionId },
    permission,
    summary:
      operation === "disconnect"
        ? "Disconnected WhatsApp from the Z-API instance"
        : "Refreshed Z-API connection status",
  };
}
