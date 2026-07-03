import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmRealtimePublisher,
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type {
  CrmWhatsappMessage,
  CrmWhatsappMessageStatus,
} from "../../ports/crmWhatsappRepository.js";
import {
  parseZapiDelivery,
  parseZapiStatus,
} from "../../whatsapp/parseZapiWebhookEvents.js";
import {
  auditZapiWebhook,
  logWhatsappServiceEvent,
  readZapiConnection,
  type ZapiWebhookInput,
  type ZapiWebhookResult,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.ingest";
const statusRank: Record<CrmWhatsappMessageStatus, number> = {
  FAILED: 5,
  READ: 4,
  DELIVERED: 3,
  SENT: 2,
  PENDING: 1,
};

export async function processZapiWhatsappDeliveryWebhook(
  context: ServiceContext,
  input: ZapiWebhookInput,
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, "crm.whatsapp.webhook.zapi.delivery.start", {
    connectionId: input.connectionId,
  });
  const parsed = parseZapiDelivery(input.payload);
  if (!parsed.externalId) {
    return { reason: "missing_message_id", status: "ignored" };
  }
  return processMessageStatus(
    context,
    {
      connectionId: input.connectionId,
      externalIds: [parsed.externalId],
      metadata: {
        deliveryConfirmedAt: parsed.providerTimestamp.toISOString(),
        ...(parsed.errorMessage ? { deliveryError: parsed.errorMessage } : {}),
      },
      status: parsed.errorMessage ? "FAILED" : "SENT",
      type: "delivery",
    },
    ports,
  );
}

export async function processZapiWhatsappStatusWebhook(
  context: ServiceContext,
  input: ZapiWebhookInput,
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, "crm.whatsapp.webhook.zapi.status.start", {
    connectionId: input.connectionId,
  });
  const parsed = parseZapiStatus(input.payload);
  if (parsed.externalIds.length === 0) {
    return { reason: "missing_message_id", status: "ignored" };
  }
  if (!parsed.status) return { reason: "unknown_status", status: "ignored" };
  if (parsed.status === "READ_BY_ME") {
    return markMessagesReadByMe(
      context,
      input.connectionId,
      parsed.externalIds,
      ports,
    );
  }
  return processMessageStatus(
    context,
    {
      connectionId: input.connectionId,
      externalIds: parsed.externalIds,
      metadata: { providerStatus: parsed.providerStatus ?? "unknown" },
      status: parsed.status,
      type: "status",
    },
    ports,
  );
}

async function processMessageStatus(
  context: ServiceContext,
  input: {
    connectionId: string;
    externalIds: string[];
    metadata: Record<string, string>;
    status: CrmWhatsappMessageStatus;
    type: "delivery" | "status";
  },
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  const connection = await readZapiConnection(input.connectionId, ports);
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  const repository = getCrmWhatsappRepository(ports);
  let processed = 0;
  for (const externalId of input.externalIds) {
    const message = await repository.findMessageByExternalId({
      connectionId: connection.id,
      externalId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    if (!message || !shouldApplyStatus(message.status, input.status)) continue;
    await repository.updateMessage({
      messageId: message.id,
      metadata: { ...message.metadata, ...input.metadata },
      status: input.status,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    const lastCustomerReadAt = await updateReadSessionState(
      repository,
      message,
      input.status,
    );
    await getCrmRealtimePublisher(ports).publish({
      connectionId: connection.id,
      ...(lastCustomerReadAt ? { lastCustomerReadAt } : {}),
      messageId: message.id,
      sessionId: message.sessionId,
      status: input.status,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      type: "message_status",
    });
    processed++;
  }
  await auditZapiWebhook(context, connection, input.type, { processed });
  return { processed, status: "accepted" };
}

async function markMessagesReadByMe(
  context: ServiceContext,
  connectionId: string,
  externalIds: string[],
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  const connection = await readZapiConnection(connectionId, ports);
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  const repository = getCrmWhatsappRepository(ports);
  const sessionIds = new Set<string>();
  for (const externalId of externalIds) {
    const message = await repository.findMessageByExternalId({
      connectionId: connection.id,
      externalId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    if (message) sessionIds.add(message.sessionId);
  }
  for (const sessionId of sessionIds) {
    await repository.updateSession({
      lastReadAt: new Date(),
      sessionId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
  }
  await auditZapiWebhook(context, connection, "status", {
    readByMeSessions: sessionIds.size,
  });
  return { processed: sessionIds.size, status: "accepted" };
}

function shouldApplyStatus(
  current: CrmWhatsappMessageStatus,
  next: CrmWhatsappMessageStatus,
) {
  if (current === "FAILED" && next !== "FAILED") return false;
  return statusRank[next] >= statusRank[current];
}

async function updateReadSessionState(
  repository: ReturnType<typeof getCrmWhatsappRepository>,
  message: CrmWhatsappMessage,
  status: CrmWhatsappMessageStatus,
) {
  if (status !== "READ") return null;
  const lastCustomerReadAt = new Date();
  await repository.updateSession({
    lastCustomerReadAt,
    sessionId: message.sessionId,
    storeId: message.storeId,
    tenantId: message.tenantId,
  });
  return lastCustomerReadAt.toISOString();
}
