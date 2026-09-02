import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmConnectionRepository } from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";

export type ReconcileConnectionStatusProvider = {
  disappearedMessage: string;
  loadStatus: () => Promise<{
    connected: boolean;
    connectedPhone?: string | null;
  }>;
  provider: "uazapi" | "zapi";
  summary: string;
};

export async function reconcileWhatsappConnectionStatus(
  providerConfig: ReconcileConnectionStatusProvider,
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<"active" | "disconnected" | "unverified"> {
  assertPermission(context, "crm.messaging.connection.setup");
  let status;
  try {
    status = await providerConfig.loadStatus();
  } catch (error) {
    logCrmServiceEvent(
      context,
      `crm.provider.${providerConfig.provider}.status_reconciliation.failed`,
      {
        connectionId: connection.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
        operation: "reconcile_setup_status",
        provider: providerConfig.provider,
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
        provider: providerConfig.provider,
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
  if (!updated) throw new Error(providerConfig.disappearedMessage);
  logCrmServiceEvent(
    context,
    `crm.provider.${providerConfig.provider}.status_reconciliation.completed`,
    {
      connectionId: connection.id,
      connected: status.connected,
      operation: "reconcile_setup_status",
      provider: providerConfig.provider,
    },
  );
  await auditCrmServiceEvent(context, {
    action: `crm.provider.${providerConfig.provider}.connection.status.reconcile`,
    category: "data_change",
    entityId: connection.id,
    entityType: "crm_channel_connection",
    metadata: { connected: status.connected, status: configuredStatus },
    permission: "crm.messaging.connection.setup",
    summary: providerConfig.summary,
  });
  return configuredStatus;
}
