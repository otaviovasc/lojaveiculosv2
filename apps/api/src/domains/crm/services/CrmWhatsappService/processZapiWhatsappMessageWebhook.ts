import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmRealtimePublisher,
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type {
  CrmMessage,
  CrmMessageStatus,
} from "../../ports/crmConversationRepository.js";
import {
  parseZapiDelivery,
  parseZapiStatus,
} from "../../whatsapp/parseZapiWebhookEvents.js";
import {
  auditZapiWebhook,
  logCrmServiceEvent,
  readZapiConnection,
  type ZapiWebhookInput,
  type ZapiWebhookResult,
} from "../CrmMessagingService/serviceSupport.js";
import { updateConversationCycleWithCas } from "../../messaging/updateConversationCycleWithCas.js";

const permission = "crm.messages.ingest";
const statusRank: Record<CrmMessageStatus, number> = {
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
  logCrmServiceEvent(context, "crm.provider.zapi.webhook.delivery.start", {
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
  logCrmServiceEvent(context, "crm.provider.zapi.webhook.status.start", {
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
    status: CrmMessageStatus;
    type: "delivery" | "status";
  },
  ports: CrmServicePorts,
): Promise<ZapiWebhookResult> {
  const connection = await readZapiConnection(
    context,
    input.connectionId,
    ports,
  );
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  const repository = getCrmConversationRepository(ports);
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
    const realtimeState = await updateReadSessionState(
      repository,
      message,
      input.status,
    );
    await getCrmRealtimePublisher(ports).publish({
      assignedUserId: realtimeState.assignedUserId,
      connectionId: connection.id,
      ...(realtimeState.lastCustomerReadAt
        ? { lastCustomerReadAt: realtimeState.lastCustomerReadAt }
        : {}),
      messageId: message.id,
      cycleId: message.cycleId,
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
  const connection = await readZapiConnection(context, connectionId, ports);
  if (!connection) return { reason: "connection_not_found", status: "ignored" };
  const repository = getCrmConversationRepository(ports);
  const cycleIds = new Set<string>();
  for (const externalId of externalIds) {
    const message = await repository.findMessageByExternalId({
      connectionId: connection.id,
      externalId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    if (message) cycleIds.add(message.cycleId);
  }
  for (const cycleId of cycleIds) {
    const readAt = new Date();
    await updateConversationCycleWithCas(repository, {
      cycleId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      update: (conversationCycle) => ({
        lastReadAt:
          conversationCycle.lastReadAt && conversationCycle.lastReadAt > readAt
            ? conversationCycle.lastReadAt
            : readAt,
      }),
    });
  }
  await auditZapiWebhook(context, connection, "status", {
    readByMeSessions: cycleIds.size,
  });
  return { processed: cycleIds.size, status: "accepted" };
}

function shouldApplyStatus(current: CrmMessageStatus, next: CrmMessageStatus) {
  if (current === "FAILED" && next !== "FAILED") return false;
  if (next === "FAILED") return current === "PENDING" || current === "SENT";
  return statusRank[next] >= statusRank[current];
}

async function updateReadSessionState(
  repository: ReturnType<typeof getCrmConversationRepository>,
  message: CrmMessage,
  status: CrmMessageStatus,
) {
  if (status !== "READ") {
    const [conversationCycle] = await repository.listConversationCycles({
      limit: 1,
      offset: 0,
      cycleId: message.cycleId,
      storeId: message.storeId,
      tenantId: message.tenantId,
    });
    return {
      assignedUserId: conversationCycle?.assignedUserId ?? null,
      lastCustomerReadAt: null,
    };
  }
  const lastCustomerReadAt = new Date();
  const conversationCycle = await updateConversationCycleWithCas(repository, {
    cycleId: message.cycleId,
    storeId: message.storeId,
    tenantId: message.tenantId,
    update: (conversationCycle) => ({
      lastCustomerReadAt:
        conversationCycle.lastCustomerReadAt &&
        conversationCycle.lastCustomerReadAt > lastCustomerReadAt
          ? conversationCycle.lastCustomerReadAt
          : lastCustomerReadAt,
    }),
  });
  return {
    assignedUserId: conversationCycle.assignedUserId,
    lastCustomerReadAt: lastCustomerReadAt.toISOString(),
  };
}
