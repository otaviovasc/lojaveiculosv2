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
import {
  auditCrmServiceEvent,
  auditZapiWebhook,
  logCrmServiceEvent,
  readZapiConnection,
  type ZapiWebhookInput,
  type ZapiWebhookResult,
} from "../CrmMessagingService/serviceSupport.js";
import { readZapiWebhookSetupState } from "../../whatsapp/zapiWebhookSetupState.js";
import { persistInitialReadyChannelDefault } from "../CrmRoutingService/persistInitialReadyChannelDefault.js";

const permission = "crm.messages.ingest";

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
  logCrmServiceEvent(context, "crm.provider.zapi.webhook.chat_presence", {
    connectionId: input.connectionId,
  });
  const connection = await readZapiConnection(input.connectionId, ports);
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  await auditCrmServiceEvent(context, {
    action: "crm.provider.zapi.webhook.chat_presence",
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
    payload: { received: true },
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
  if (
    input.status === "active" &&
    readZapiWebhookSetupState(connection.metadata)?.status !== "configured"
  ) {
    await auditZapiWebhook(context, connection, input.eventType, {
      ignoredReason: "webhook_setup_not_configured",
    });
    return { reason: "setup_not_configured", status: "ignored" };
  }
  await getCrmConnectionRepository(ports).updateConnection({
    connectionId: connection.id,
    metadata: {
      ...connection.metadata,
      connected: input.status === "active",
      [`last${capitalize(input.eventType)}At`]: new Date().toISOString(),
      providerConnected: input.status === "active",
    },
    ...(input.connectedPhone ? { phone: input.connectedPhone } : {}),
    status: input.status,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (
    input.status === "active" &&
    ports.crmRoutingConnectionRepository &&
    ports.crmRoutingPolicyRepository
  ) {
    await persistInitialReadyChannelDefault(
      context,
      { channel: "whatsapp", connectionId: connection.id },
      ports,
    );
  }
  await auditZapiWebhook(context, connection, input.eventType, {
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
  return { status: "accepted" };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
