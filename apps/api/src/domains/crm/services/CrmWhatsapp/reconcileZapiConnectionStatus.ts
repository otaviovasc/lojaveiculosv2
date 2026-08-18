import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmConnectionRepository } from "../CrmService/serviceSupport.js";
import { getZapiConnectionSetupProvider } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";
import { openZapiSetupCredentials } from "./zapiWhatsappConnectionSetup.js";

export async function reconcileZapiConnectionStatus(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<void> {
  assertPermission(context, "crm.messaging.connection.setup");
  let status;
  try {
    status = await getZapiConnectionSetupProvider(ports).validateStatus(
      await openZapiSetupCredentials(connection, ports),
    );
  } catch (error) {
    logWhatsappServiceEvent(
      context,
      "crm.provider.zapi.status_reconciliation.failed",
      {
        connectionId: connection.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
        operation: "reconcile_setup_status",
        provider: "zapi",
      },
    );
    return;
  }
  const configuredStatus = status.connected ? "active" : "disconnected";
  const updated = await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    metadata: {
      ...connection.metadata,
      lastProviderStatusCheckedAt: new Date().toISOString(),
      providerConnected: status.connected,
    },
    ...(status.connectedPhone ? { phone: status.connectedPhone } : {}),
    status: configuredStatus,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!updated) throw new Error("Z-API connection status target disappeared.");
  logWhatsappServiceEvent(
    context,
    "crm.provider.zapi.status_reconciliation.completed",
    {
      connectionId: connection.id,
      connected: status.connected,
      operation: "reconcile_setup_status",
      provider: "zapi",
    },
  );
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.connection.zapi.status.reconcile",
    category: "data_change",
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata: { connected: status.connected, status: configuredStatus },
    permission: "crm.messaging.connection.setup",
    summary: "Reconciled Z-API connection status after webhook setup",
  });
}
