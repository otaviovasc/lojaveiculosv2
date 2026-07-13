import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type {
  CrmBotSenderOrigin,
  CrmBotWebhookEvent,
  CrmBotWebhookPayload,
} from "../ports/crmBotWebhookDispatcher.js";
import type { InterventionEventDetails } from "./whatsappBotInterventionDetails.js";

export type BuildCrmBotWebhookPayloadInput = {
  connection: CrmConnection;
  event: CrmBotWebhookEvent;
  intervention?: InterventionEventDetails;
  message?: CrmWhatsappMessage;
  session: CrmWhatsappSession;
  timestamp: Date;
  triggeredBy?: "bot" | "human" | "system";
};

export type BuildCrmBotConnectionStatusPayloadInput = {
  connection: CrmConnection;
  previousStatus: string | null;
  reason: string | null;
  status: string;
  timestamp: Date;
};

export function buildCrmBotWebhookPayload(
  actionApiBaseUrl: string,
  input: BuildCrmBotWebhookPayloadInput,
): CrmBotWebhookPayload {
  return {
    actionsApi: {
      authentication: "X-Webhook-Secret",
      baseUrl: actionApiBaseUrl,
    },
    chat: {
      buyerName: input.session.buyerName,
      phone: input.session.buyerPhone,
      profilePhotoUrl: input.session.profilePhotoUrl,
      whatsappLid: input.session.buyerChatLid,
    },
    connection: {
      id: input.connection.id,
      phone: input.connection.phone,
      provider: input.connection.provider,
      status: input.connection.status,
      uuid: input.connection.id,
    },
    connectionId: input.connection.id,
    connectionPhone: input.connection.phone,
    connectionUuid: input.connection.id,
    event: input.event,
    instanceName: input.connection.displayName,
    ...(input.intervention
      ? { intervention: buildInterventionPayload(input, input.intervention) }
      : {}),
    ...(input.message ? { message: botMessage(input.message) } : {}),
    session: {
      ...adAttribution(input.session.metadata),
      assignedUserId: input.session.assignedUserId,
      id: input.session.id,
      isBotActive: isBotActive(input.session.status),
      leadId: input.session.leadId,
      messageCount: input.session.messageCount,
      status: input.session.status,
      tags: (input.session.sessionTags ?? []).map((tag) => ({
        color: tag.color,
        emoji: tag.emoji,
        id: tag.id,
        name: tag.name,
      })),
      uuid: input.session.id,
    },
    timestamp: input.timestamp.toISOString(),
  };
}

function adAttribution(metadata: Record<string, unknown>) {
  if (metadata.isAdInitiated !== true) return {};
  return {
    adAttribution: {
      body: readText(metadata.adBody),
      conversationType: readText(metadata.adConversationType),
      detectedAt: readText(metadata.adDetectedAt),
      detectionMethod: readText(metadata.adDetectionMethod),
      sourceApp: readText(metadata.adSourceApp),
      sourceId: readText(metadata.adSourceId),
      sourceUrl: readText(metadata.adSourceUrl),
      thumbnailUrl: readText(metadata.adThumbnailUrl),
      title: readText(metadata.adTitle),
    },
  };
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildCrmBotConnectionStatusPayload(
  actionApiBaseUrl: string,
  input: BuildCrmBotConnectionStatusPayloadInput,
): CrmBotWebhookPayload {
  return {
    actionsApi: {
      authentication: "X-Webhook-Secret",
      baseUrl: actionApiBaseUrl,
    },
    connection: {
      id: input.connection.id,
      phone: input.connection.phone,
      provider: input.connection.provider,
      status: input.status,
      uuid: input.connection.id,
    },
    connectionId: input.connection.id,
    connectionPhone: input.connection.phone,
    connectionUuid: input.connection.id,
    event: "connection_status_changed",
    instanceName: input.connection.displayName,
    previousStatus: input.previousStatus,
    reason: input.reason,
    status: input.status,
    timestamp: input.timestamp.toISOString(),
  };
}

export function botSenderOrigin(
  message: CrmWhatsappMessage,
): CrmBotSenderOrigin {
  if (message.direction === "INBOUND") return "customer";
  if (message.senderType === "AI") return "bot_api";
  if (message.senderType === "SYSTEM") return "system";
  return wasSentByApi(message) ? "human_crm" : "human_whatsapp";
}

function buildInterventionPayload(
  input: BuildCrmBotWebhookPayloadInput,
  intervention: InterventionEventDetails,
) {
  return {
    active: input.event === "intervention_started",
    durationSeconds: intervention.durationSeconds,
    endedAt: intervention.endedAt?.toISOString() ?? null,
    messageCount: intervention.messageCount,
    reason: intervention.reason,
    startedAt: intervention.startedAt?.toISOString() ?? null,
    summary: intervention.summary,
    triggeredBy: input.triggeredBy ?? "system",
  };
}

function botMessage(
  message: CrmWhatsappMessage,
): NonNullable<CrmBotWebhookPayload["message"]> {
  const fromMe = message.direction === "OUTBOUND";
  return {
    content: message.content,
    direction: fromMe ? "outbound" : "inbound",
    fromMe,
    id: message.id,
    mediaType: message.mediaType,
    mediaUrl: message.mediaUrl,
    providerMessageId: message.externalId,
    senderOrigin: botSenderOrigin(message),
    timestamp: (message.providerTimestamp ?? message.createdAt).toISOString(),
    type: message.type.toLowerCase(),
    uuid: message.id,
    wasSentByApi: wasSentByApi(message),
  };
}

function wasSentByApi(message: CrmWhatsappMessage) {
  return (
    message.senderType === "AI" ||
    typeof message.metadata?.sentByActorId === "string"
  );
}

function isBotActive(status: string) {
  return !["COMPLETED", "EXPIRED", "HUMAN_TAKEOVER"].includes(status);
}
