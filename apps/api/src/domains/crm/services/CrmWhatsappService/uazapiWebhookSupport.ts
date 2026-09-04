import type { SafeAuditMetadata } from "@lojaveiculosv2/audit";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";

export type UazapiWebhookInput = {
  connectionId: string;
  payload: Record<string, unknown>;
};

export type UazapiWebhookResult =
  | { eventId: string; status: "duplicate" }
  | { reason: string; status: "ignored" }
  | { processed?: number; status: "accepted" };

export async function readUazapiConnection(
  context: ServiceContext,
  connectionId: string,
  ports: CrmServicePorts,
) {
  const connection =
    await getCrmConnectionRepository(ports).findConnectionById(connectionId);
  if (
    !connection ||
    connection.provider !== "uazapi" ||
    connection.status === "archived" ||
    !context.storeId ||
    !context.tenantId ||
    connection.storeId !== context.storeId ||
    connection.tenantId !== context.tenantId
  ) {
    return null;
  }
  return connection;
}

export async function auditUazapiWebhook(
  context: ServiceContext,
  connection: CrmConnection,
  webhookType: string,
  metadata: SafeAuditMetadata = {},
) {
  logCrmServiceEvent(context, `crm.provider.uazapi.webhook.${webhookType}`, {
    connectionId: connection.id,
    ...metadata,
  });
  await auditCrmServiceEvent(context, {
    action: `crm.provider.uazapi.webhook.${webhookType}`,
    category: "data_change",
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata,
    permission: "crm.messages.ingest",
    storeId: connection.storeId,
    summary: "Processed Uazapi WhatsApp webhook",
    tenantId: connection.tenantId,
  });
}
