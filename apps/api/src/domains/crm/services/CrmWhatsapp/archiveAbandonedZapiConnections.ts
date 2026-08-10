import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";

const cleanupPermission = "crm.whatsapp.connection.manage" as const;
export const abandonedZapiConnectionTtlMs = 7 * 24 * 60 * 60 * 1_000;

export async function archiveAbandonedZapiConnections(
  context: ServiceContext,
  input: { limit?: number; now?: Date } = {},
  ports: CrmServicePorts,
) {
  assertPermission(context, cleanupPermission);
  if (context.actor.kind !== "system") {
    throw new AuthorizationError(
      "CRM connection cleanup requires a system actor.",
    );
  }
  const now = input.now ?? new Date();
  const cutoff = new Date(now.getTime() - abandonedZapiConnectionTtlMs);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const recoveryPayloadsPurged = ports.crmWhatsappOutboundIntentRepository
    ? await ports.crmWhatsappOutboundIntentRepository.purgeExpiredRecoveryPayloads(
        { limit, now },
      )
    : 0;
  const archived = await getCrmConnectionRepository(
    ports,
  ).archiveAbandonedZapiConnections({
    cutoff,
    limit,
  });
  for (const connection of archived) {
    await auditWhatsappServiceEvent(context, {
      action: "crm.whatsapp.connection.zapi.abandoned.archive",
      category: "data_change",
      entityId: connection.id,
      entityType: "crm_whatsapp_connection",
      metadata: { reason: "setup_abandoned", ttlDays: 7 },
      permission: cleanupPermission,
      storeId: connection.storeId,
      summary: "Archived abandoned Z-API setup connection",
      tenantId: connection.tenantId,
    });
  }
  logWhatsappServiceEvent(context, "crm.provider.zapi.cleanup.completed", {
    archivedCount: archived.length,
    cutoff: cutoff.toISOString(),
    provider: "zapi",
    recoveryPayloadsPurged,
  });
  return { archived: archived.length, cutoff, recoveryPayloadsPurged };
}
