import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappMessageStatus,
  CrmWhatsappMessageType,
} from "../ports/crmWhatsappRepository.js";
import type {
  MetaMediaReference,
  ParsedMetaWebhookEvent,
} from "./parseMetaWebhookEvents.js";
import {
  getCrmRealtimePublisher,
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { updateWhatsappSessionWithCas } from "../whatsapp/updateWhatsappSessionWithCas.js";

const statusRank: Record<CrmWhatsappMessageStatus, number> = {
  FAILED: 5,
  READ: 4,
  DELIVERED: 3,
  SENT: 2,
  PENDING: 1,
};

export async function applyMetaMessageStatus(
  connection: CrmConnection,
  event: Extract<ParsedMetaWebhookEvent, { kind: "status" }>,
  ports: CrmServicePorts,
) {
  const repository = getCrmWhatsappRepository(ports);
  const message = await repository.findMessageByExternalId({
    connectionId: connection.id,
    externalId: event.externalMessageId,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (!message) return "pending_message" as const;
  if (!shouldApplyStatus(message.status, event.status))
    return "ignored" as const;
  await repository.updateMessage({
    messageId: message.id,
    metadata: {
      ...message.metadata,
      providerEventId: event.providerEventKey,
      ...(event.timestamp
        ? { providerStatusAt: event.timestamp.toISOString() }
        : {}),
      providerStatus: event.status,
    },
    status: event.status,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  const lastCustomerReadAt =
    event.status === "READ" ? (event.timestamp ?? new Date()) : null;
  const session = lastCustomerReadAt
    ? await updateWhatsappSessionWithCas(repository, {
        sessionId: message.sessionId,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
        update: (current) => ({
          lastCustomerReadAt: laterDate(
            current.lastCustomerReadAt,
            lastCustomerReadAt,
          ),
        }),
      })
    : (
        await repository.listSessions({
          limit: 1,
          offset: 0,
          sessionId: message.sessionId,
          storeId: connection.storeId,
          tenantId: connection.tenantId,
        })
      )[0];
  await getCrmRealtimePublisher(ports).publish({
    assignedUserId: session?.assignedUserId ?? null,
    connectionId: connection.id,
    ...(lastCustomerReadAt
      ? { lastCustomerReadAt: lastCustomerReadAt.toISOString() }
      : {}),
    messageId: message.id,
    sessionId: message.sessionId,
    status: event.status,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "message_status",
  });
  return "applied" as const;
}

function laterDate(current: Date | null, incoming: Date) {
  return current && current > incoming ? current : incoming;
}

export function metaMessageContent(
  event: Extract<ParsedMetaWebhookEvent, { kind: "message" }>,
) {
  if (event.text) return event.text;
  return event.media ? `[${event.media.type}]` : "[unsupported message]";
}

export function metaMessageType(
  event: Extract<ParsedMetaWebhookEvent, { kind: "message" }>,
): CrmWhatsappMessageType {
  const type = event.media?.type.toUpperCase();
  if (
    type === "AUDIO" ||
    type === "DOCUMENT" ||
    type === "IMAGE" ||
    type === "STICKER" ||
    type === "VIDEO"
  ) {
    return type;
  }
  return "TEXT";
}

export function serializedMetaEvent(
  event: ParsedMetaWebhookEvent,
): Record<string, unknown> {
  return {
    ...event,
    ...(event.kind === "message"
      ? { media: opaqueMetaMediaReference(event.media) }
      : {}),
    timestamp: event.timestamp?.toISOString() ?? null,
  };
}

export function opaqueMetaMediaReference(media: MetaMediaReference | null) {
  return media ? { ...media, url: null } : null;
}

function shouldApplyStatus(
  current: CrmWhatsappMessageStatus,
  next: CrmWhatsappMessageStatus,
) {
  if (current === "FAILED" && next !== "FAILED") return false;
  if (next === "FAILED") return current === "PENDING" || current === "SENT";
  return statusRank[next] >= statusRank[current];
}
