import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  parseMetaWebhookEvents,
  type ParsedMetaWebhookEvent,
} from "../../messaging/parseMetaWebhookEvents.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { createWhatsappMessageActivity } from "../../whatsapp/createWhatsappMessageActivity.js";
import { forwardWhatsappMessageToBot } from "../../whatsapp/whatsappBotWebhookForwarding.js";
import {
  toWhatsappMessage,
  toWhatsappSession,
} from "../../whatsapp/whatsappModels.js";
import {
  getCrmConnectionRepository,
  getCrmEnvironment,
  getCrmRealtimePublisher,
  getCrmWebhookEventRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { resolveMetaMessageIdentity } from "../../messaging/resolveMetaMessageIdentity.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "../CrmWhatsapp/serviceSupport.js";
import {
  applyMetaMessageStatus,
  metaMessageContent,
  metaMessageType,
  opaqueMetaMediaReference,
  serializedMetaEvent,
} from "../../messaging/metaWebhookProcessingSupport.js";

const permission = "crm.whatsapp.ingest";
const ingestibleConnectionStatuses = new Set(["active", "sandbox"]);

export type ProcessMetaMessagingWebhookResult = {
  duplicates: number;
  ignored: number;
  processed: number;
  total: number;
};

export async function processMetaMessagingWebhook(
  context: ServiceContext,
  payload: Record<string, unknown>,
  ports: CrmServicePorts,
): Promise<ProcessMetaMessagingWebhookResult> {
  assertPermission(context, permission);
  const events = parseMetaWebhookEvents(payload);
  const result: ProcessMetaMessagingWebhookResult = {
    duplicates: 0,
    ignored: 0,
    processed: 0,
    total: events.length,
  };
  logWhatsappServiceEvent(context, "crm.messaging.webhook.meta.received", {
    eventCount: events.length,
  });
  let firstError: unknown;
  for (const event of events) {
    try {
      await processEvent(context, event, ports, result);
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
  return result;
}
async function processEvent(
  context: ServiceContext,
  event: ParsedMetaWebhookEvent,
  ports: CrmServicePorts,
  result: ProcessMetaMessagingWebhookResult,
) {
  const connections = getCrmConnectionRepository(ports);
  const connection = await connections.findConnectionByExternalId({
    externalConnectionId: event.externalConnectionId,
    providers: [event.provider],
  });
  const events = getCrmWebhookEventRepository(ports);
  const recorded = await events.recordReceived({
    ...(connection
      ? {
          connectionId: connection.id,
          storeId: connection.storeId,
          tenantId: connection.tenantId,
        }
      : {}),
    environment: getCrmEnvironment(ports),
    eventType: `meta.${event.kind}`,
    payload: serializedMetaEvent(event),
    provider: event.provider,
    providerEventId: event.providerEventKey,
  });
  const processingStartedAt = new Date();
  const processingToken = randomUUID();
  const claimed = await events.claimForProcessing({
    eventId: recorded.event.id,
    processingStartedAt,
    processingToken,
    staleBefore: new Date(processingStartedAt.getTime() - 5 * 60 * 1_000),
  });
  if (!claimed) {
    result.duplicates += 1;
    return;
  }
  if (!connection || !ingestibleConnectionStatuses.has(connection.status)) {
    await events.updateStatus({
      eventId: claimed.id,
      processingToken,
      status: "ignored",
    });
    result.ignored += 1;
    return;
  }
  try {
    const outcome =
      event.kind === "message"
        ? await ingestMessage(context, connection, event, ports)
        : await applyMetaMessageStatus(connection, event, ports);
    if (outcome === "pending_message") {
      throw new MetaStatusMessagePendingError(event.externalMessageId);
    }
    const processed = outcome === true || outcome === "applied";
    await events.updateStatus({
      eventId: claimed.id,
      processingToken,
      status: processed ? "processed" : "ignored",
    });
    result[processed ? "processed" : "ignored"] += 1;
    await auditWhatsappServiceEvent(context, {
      action: `crm.messaging.webhook.meta.${event.kind}`,
      category: "data_change",
      entityId: connection.id,
      entityType: "crm_messaging_connection",
      metadata: {
        provider: event.provider,
        providerEventId: event.providerEventKey,
      },
      permission,
      storeId: connection.storeId,
      summary: `Processed Meta ${event.kind} webhook`,
      tenantId: connection.tenantId,
    });
  } catch (error) {
    await events.updateStatus({
      errorMessage: error instanceof Error ? error.name : "UnknownError",
      eventId: claimed.id,
      processingToken,
      status: "failed",
    });
    throw error;
  }
}

class MetaStatusMessagePendingError extends Error {
  constructor(externalMessageId: string) {
    super(`Meta status message is not persisted yet: ${externalMessageId}`);
    this.name = "MetaStatusMessagePendingError";
  }
}

async function ingestMessage(
  context: ServiceContext,
  connection: CrmConnection,
  event: Extract<ParsedMetaWebhookEvent, { kind: "message" }>,
  ports: CrmServicePorts,
) {
  const timestamp = event.timestamp ?? new Date();
  const persisted = await runCrmTransaction(ports, async (transactionPorts) => {
    const { buyerPhone, channel, lead, repository } =
      await resolveMetaMessageIdentity(transactionPorts, connection, event);
    const mediaType = event.media?.type ?? null;
    const result = await repository.ingestMessage({
      buyerPhone,
      channel,
      channelExternalId: event.contactExternalId,
      channelMessageId: event.externalMessageId,
      connectionId: connection.id,
      content: metaMessageContent(event),
      direction: event.direction,
      externalId: event.externalMessageId,
      freshLeadAt: event.direction === "INBOUND" ? timestamp : null,
      leadId: lead.id,
      ...(mediaType ? { mediaType } : {}),
      metadata: {
        media: opaqueMetaMediaReference(event.media),
        provider: event.provider,
        providerEventId: event.providerEventKey,
      },
      providerTimestamp: timestamp,
      senderOrigin: event.direction === "INBOUND" ? "customer" : "unknown",
      senderType: event.direction === "INBOUND" ? "CUSTOMER" : "SYSTEM",
      status: event.direction === "INBOUND" ? "DELIVERED" : "SENT",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
      type: metaMessageType(event),
    });
    if (result.createdMessage) {
      await createWhatsappMessageActivity(transactionPorts, {
        connectionId: connection.id,
        content: metaMessageContent(event),
        direction: event.direction === "INBOUND" ? "inbound" : "outbound",
        leadId: lead.id,
        messageExternalId: event.externalMessageId,
        occurredAt: timestamp,
        provider: event.provider,
        sessionId: result.session.id,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
    }
    return result;
  });

  const message = toWhatsappMessage(persisted.message);
  const session = toWhatsappSession(persisted.session, connection);
  const publisher = getCrmRealtimePublisher(ports);
  await publisher.publish({
    connectionId: connection.id,
    message,
    session,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "message",
  });
  await publisher.publish({
    connectionId: connection.id,
    session,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "session",
  });
  await forwardWhatsappMessageToBot(
    context,
    { connection, message: persisted.message, session: persisted.session },
    ports,
  );
  return true;
}
