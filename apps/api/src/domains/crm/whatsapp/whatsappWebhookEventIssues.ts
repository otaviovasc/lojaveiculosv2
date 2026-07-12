import type { CrmProviderWebhookEvent } from "../ports/crmWebhookEventRepository.js";
import type { ZapiWebhookType } from "./zapiWebhookEventKey.js";

export type WhatsappWebhookEventAttentionReason =
  "processing_failed" | "received_message_ignored";

export type WhatsappWebhookEventSummary = {
  attentionReason: WhatsappWebhookEventAttentionReason | null;
  connectionId: string | null;
  createdAt: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  processedAt: string | null;
  providerEventId: string;
  retryable: boolean;
  status: CrmProviderWebhookEvent["status"];
  updatedAt: string;
  webhookType: ZapiWebhookType | null;
};

export function toWebhookEventSummary(
  event: CrmProviderWebhookEvent,
): WhatsappWebhookEventSummary {
  const attentionReason = readWebhookEventAttentionReason(event);
  return {
    attentionReason,
    connectionId: event.connectionId,
    createdAt: event.createdAt.toISOString(),
    errorMessage: event.errorMessage,
    eventType: event.eventType,
    id: event.id,
    processedAt: event.processedAt?.toISOString() ?? null,
    providerEventId: event.providerEventId,
    retryable: Boolean(attentionReason && readZapiWebhookType(event.eventType)),
    status: event.status,
    updatedAt: event.updatedAt.toISOString(),
    webhookType: readZapiWebhookType(event.eventType),
  };
}

export function readWebhookEventAttentionReason(
  event: CrmProviderWebhookEvent,
): WhatsappWebhookEventAttentionReason | null {
  if (event.status === "failed") return "processing_failed";
  if (
    event.status === "ignored" &&
    event.eventType === "crm.whatsapp.zapi.received" &&
    isMessageLikeZapiReceivedPayload(event.payload)
  ) {
    return "received_message_ignored";
  }
  return null;
}

export function readZapiWebhookType(eventType: string): ZapiWebhookType | null {
  const prefix = "crm.whatsapp.zapi.";
  if (!eventType.startsWith(prefix)) return null;
  const type = eventType.slice(prefix.length);
  if (
    type === "chat_presence" ||
    type === "connected" ||
    type === "delivery" ||
    type === "disconnected" ||
    type === "received" ||
    type === "status"
  ) {
    return type;
  }
  return null;
}

function isMessageLikeZapiReceivedPayload(payload: Record<string, unknown>) {
  const type = readString(payload.type);
  if (type && type !== "ReceivedCallback") return false;
  if (
    readBoolean(payload.isGroup) ||
    readBoolean(payload.broadcast) ||
    readBoolean(payload.isNewsletter) ||
    readBoolean(payload.waitingMessage)
  ) {
    return false;
  }
  if (!readString(payload.messageId) && !readString(payload.msgId)) {
    return false;
  }
  return [
    "audio",
    "buttonsResponseMessage",
    "contact",
    "document",
    "image",
    "listResponseMessage",
    "location",
    "poll",
    "pollVote",
    "reaction",
    "sticker",
    "text",
    "video",
  ].some((key) => payload[key] !== undefined && payload[key] !== null);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readBoolean(value: unknown) {
  return value === true;
}
