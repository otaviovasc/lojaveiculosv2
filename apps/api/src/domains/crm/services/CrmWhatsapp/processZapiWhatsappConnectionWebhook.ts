import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmRealtimePublisher,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  parseZapiConnected,
  parseZapiDisconnected,
} from "../../whatsapp/parseZapiWebhookEvents.js";
import { notifyWhatsappConnectionStatusChangedToBot } from "../../whatsapp/whatsappBotWebhookForwarding.js";
import {
  auditWhatsappServiceEvent,
  auditZapiWebhook,
  logWhatsappServiceEvent,
  readZapiConnection,
  type ZapiWebhookInput,
  type ZapiWebhookResult,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.ingest";

export async function processZapiWhatsappConnectedWebhook(
  context: ServiceContext,
  input: ZapiWebhookInput,
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  const parsed = parseZapiConnected(input.payload);
  return updateConnectionState(
    context,
    input.connectionId,
    {
      connectedPhone: parsed.connectedPhone,
      eventType: "connected",
      status: parsed.status,
    },
    ports,
  );
}

export async function processZapiWhatsappDisconnectedWebhook(
  context: ServiceContext,
  input: ZapiWebhookInput,
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  const parsed = parseZapiDisconnected(input.payload);
  return updateConnectionState(
    context,
    input.connectionId,
    {
      connectedPhone: parsed.connectedPhone,
      eventType: "disconnected",
      status: parsed.status,
    },
    ports,
  );
}

export async function processZapiWhatsappChatPresenceWebhook(
  context: ServiceContext,
  input: ZapiWebhookInput,
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, "crm.whatsapp.webhook.zapi.chat_presence", {
    connectionId: input.connectionId,
  });
  const connection = await readZapiConnection(input.connectionId, ports);
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.webhook.zapi.chat_presence",
    category: "data_access",
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata: { payloadKeys: Object.keys(input.payload).join(",") },
    permission,
    storeId: connection.storeId,
    summary: "Accepted ZAPI WhatsApp chat presence webhook",
    tenantId: connection.tenantId,
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    payload: input.payload,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "presence",
  });
  return { status: "accepted" };
}

async function updateConnectionState(
  context: ServiceContext,
  connectionId: string,
  input: {
    connectedPhone: string | null;
    eventType: "connected" | "disconnected";
    status: "active" | "disconnected";
  },
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  assertPermission(context, permission);
  const connection = await readZapiConnection(connectionId, ports);
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  const previousPhone = connection.phone;
  const previousStatus = connection.status;
  await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    metadata: {
      ...connection.metadata,
      [`last${capitalize(input.eventType)}At`]: new Date().toISOString(),
    },
    ...(input.connectedPhone ? { phone: input.connectedPhone } : {}),
    status: input.status,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  await auditZapiWebhook(context, connection, input.eventType, {
    ...(input.connectedPhone ? { connectedPhone: input.connectedPhone } : {}),
    status: input.status,
  });
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    phone: input.connectedPhone ?? connection.phone,
    status: input.status,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "connection_status",
  });
  await notifyWhatsappConnectionStatusChangedToBot(
    context,
    {
      connection: {
        ...connection,
        phone: input.connectedPhone ?? previousPhone,
        status: input.status,
      },
      previousStatus,
      reason: input.eventType,
      status: input.status,
    },
    ports,
  );
  return { status: "accepted" };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
