import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmConnectionRepository } from "../CrmService/serviceSupport.js";
import { getZapiConnectionSetupProvider } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { openZapiSetupCredentials } from "./zapiWhatsappConnectionSetup.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";

export async function reconcileZapiConnectionStatus(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<"active" | "disconnected" | "unverified"> {
  assertPermission(context, "crm.messaging.connection.setup");
  let status;
  try {
    status = await getZapiConnectionSetupProvider(ports).validateStatus(
      await openZapiSetupCredentials(connection, ports),
    );
  } catch (error) {
    logCrmServiceEvent(
      context,
      "crm.provider.zapi.status_reconciliation.failed",
      {
        connectionId: connection.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
        operation: "reconcile_setup_status",
        provider: "zapi",
      },
    );
    return "unverified";
  }
  const configuredStatus = status.connected ? "active" : "disconnected";
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    metadata: {
      ...connection.metadata,
      capabilities: crmChannelConnectionCapabilityFacts({
        broker: "direct",
        channel: "whatsapp",
        provider: "zapi",
      }),
      connected: status.connected,
      degraded: false,
      errorCode: null,
      lastProviderStatusCheckedAt: new Date().toISOString(),
      providerConnected: status.connected,
    },
    ...(status.connectedPhone ? { phone: status.connectedPhone } : {}),
    status: configuredStatus,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new Error("Z-API connection status target disappeared.");
  logCrmServiceEvent(
    context,
    "crm.provider.zapi.status_reconciliation.completed",
    {
      connectionId: connection.id,
      connected: status.connected,
      operation: "reconcile_setup_status",
      provider: "zapi",
    },
  );
  await auditCrmServiceEvent(context, {
    action: "crm.provider.zapi.connection.status.reconcile",
    category: "data_change",
    entityId: connection.id,
    entityType: "crm_channel_connection",
    metadata: { connected: status.connected, status: configuredStatus },
    permission: "crm.messaging.connection.setup",
    summary: "Reconciled Z-API connection status after webhook setup",
  });
  return configuredStatus;
}
