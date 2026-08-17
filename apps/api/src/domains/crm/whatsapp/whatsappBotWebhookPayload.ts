import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../ports/crmWhatsappRepository.js";
import type {
  CrmBotSenderOrigin,
  CrmInterventionSource,
  CrmBotWebhookEvent,
  CrmBotWebhookPayload,
} from "../ports/crmBotWebhookDispatcher.js";
import type { InterventionEventDetails } from "./whatsappBotInterventionDetails.js";
import type { CrmRoutingChannel } from "../ports/crmRoutingPolicyRepository.js";

export type BuildCrmBotWebhookPayloadInput = {
  connection: CrmConnection;
  event: CrmBotWebhookEvent;
  intervention?: InterventionEventDetails;
  message?: CrmWhatsappMessage;
  session: CrmWhatsappSession;
  timestamp: Date;
  triggeredBy?: CrmInterventionSource;
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
  if (input.session.connectionId !== input.connection.id) {
    throw new Error(
      "CRM bot webhook session connection does not match the provider event connection.",
    );
  }
  const channel = routingChannelForSession(input.session);
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
    channel,
    connection: {
      channel,
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
      humanAttendanceChangedAt:
        input.session.humanAttendanceChangedAt?.toISOString() ?? null,
      humanAttendanceState: input.session.humanAttendanceState,
      humanAttendanceStateVersion: input.session.humanAttendanceStateVersion,
      humanHandlingStartedAt:
        input.session.humanHandlingStartedAt?.toISOString() ?? null,
      id: input.session.id,
      interventionId: input.session.interventionId,
      isBotActive: isBotActive(input.session.status),
      leadId: input.session.leadId,
      messageCount: input.session.messageCount,
      revision: input.session.revision,
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
  const channel = routingChannelForProvider(input.connection.provider);
  return {
    actionsApi: {
      authentication: "X-Webhook-Secret",
      baseUrl: actionApiBaseUrl,
    },
    channel,
    connection: {
      channel,
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

function routingChannelForSession(
  session: CrmWhatsappSession,
): CrmRoutingChannel {
  if (session.channel === "INSTAGRAM") return "instagram";
  if (session.channel === "OLX_CHAT") return "olx_chat";
  return "whatsapp";
}

function routingChannelForProvider(
  provider: CrmConnection["provider"],
): CrmRoutingChannel {
  if (provider === "composio_instagram") return "instagram";
  if (provider === "olx_chat") return "olx_chat";
  return "whatsapp";
}

export function botSenderOrigin(
  message: CrmWhatsappMessage,
): CrmBotSenderOrigin {
  return message.senderOrigin;
}

function buildInterventionPayload(
  input: BuildCrmBotWebhookPayloadInput,
  intervention: InterventionEventDetails,
) {
  return {
    active: input.event === "intervention_started",
    attendanceState: intervention.attendanceState,
    durationSeconds: intervention.durationSeconds,
    endedAt: intervention.endedAt?.toISOString() ?? null,
    id: intervention.interventionId,
    messageCount: intervention.messageCount,
    reason: intervention.reason,
    source: intervention.source,
    startedAt: intervention.startedAt?.toISOString() ?? null,
    stateChangedAt: intervention.stateChangedAt?.toISOString() ?? null,
    stateVersion: intervention.stateVersion,
    summary: intervention.summary,
    triggeredBy: input.triggeredBy ?? "auto",
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
  return ["bot_api", "human_crm", "system"].includes(message.senderOrigin);
}

function isBotActive(status: string) {
  return !["COMPLETED", "EXPIRED", "HUMAN_TAKEOVER"].includes(status);
}
