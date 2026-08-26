import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConversationRepository,
  getCrmMediaStorage,
  getCrmRealtimePublisher,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  parseZapiContactIdentity,
  parseZapiInboundMessage,
  type ParsedZapiInboundMessage,
} from "../../whatsapp/parseZapiInboundMessage.js";
import {
  isZapiNotificationPayload,
  parseZapiAdAttribution,
} from "../../whatsapp/zapiAdAttribution.js";
import { mirrorZapiWhatsappMedia } from "../../whatsapp/mirrorZapiWhatsappMedia.js";
import { enqueueCrmMessageExternalBotEvent } from "../../bot/externalBotEventForwarding.js";
import {
  logCrmServiceEvent,
  readZapiConnection as readConnection,
  recordCrmServiceMutation,
  type CrmServiceAuditInput,
} from "../CrmMessagingService/serviceSupport.js";
import { captureZapiAdNotification } from "../../whatsapp/captureZapiAdNotification.js";
import type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../whatsapp/ingestZapiWhatsappWebhookTypes.js";
import {
  publishZapiWhatsappAttendanceEnded,
  publishZapiWhatsappAttendanceStarted,
} from "../../whatsapp/publishZapiWhatsappAttendance.js";
import { ingestZapiProfilePhoto } from "../../whatsapp/zapiProfilePhotoIngestion.js";
import { persistZapiWhatsappWebhook } from "../../whatsapp/persistZapiWhatsappWebhook.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";

const permission = "crm.messages.ingest" as const;
export type {
  IngestZapiWhatsappWebhookInput,
  IngestZapiWhatsappWebhookResult,
} from "../../whatsapp/ingestZapiWhatsappWebhookTypes.js";
type OptionalMirrorInput = {
  connection: CrmConnection;
  conversationCycle: CrmConversationCycle;
  message: ParsedZapiInboundMessage;
};

export async function ingestZapiWhatsappWebhook(
  context: ServiceContext,
  input: IngestZapiWhatsappWebhookInput,
  ports: CrmServicePorts,
): Promise<IngestZapiWhatsappWebhookResult> {
  assertPermission(context, permission);
  logCrmServiceEvent(context, "crm.provider.zapi.webhook.received", {
    connectionId: input.connectionId,
  });
  const connection = await readConnection(context, input.connectionId, ports);
  if (!connection) return { reason: "connection_not_found", status: "ignored" };

  const detectedAt = new Date();
  const notification = isZapiNotificationPayload(input.payload);
  const attribution = parseZapiAdAttribution(input.payload, {
    detectedAt,
    notification,
  });
  const parsed = parseZapiInboundMessage(input.payload);
  if (!parsed) {
    const identity = parseZapiContactIdentity(input.payload);
    if (notification && attribution && identity && !identity.fromMe) {
      return captureZapiAdNotification(
        context,
        { attribution, connection, detectedAt, identity },
        ports,
      );
    }
    return { reason: "not_processable", status: "ignored" };
  }
  const media = pendingZapiMedia(parsed);
  const profilePhoto = { status: "unavailable" as const };
  const auditInput: CrmServiceAuditInput = {
    action: "crm.provider.zapi.webhook.received",
    category: "data_change" as const,
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata: { externalId: parsed.externalId },
    permission,
    storeId: connection.storeId,
    summary: "Ingested ZAPI WhatsApp webhook",
    tenantId: connection.tenantId,
  };
  const persisted = await recordCrmServiceMutation(context, auditInput, () =>
    persistZapiWhatsappWebhook(
      context,
      { attribution, connection, detectedAt, media, parsed, profilePhoto },
      ports,
    ),
  );

  const { attendanceTransition, result, transition } = persisted;
  const message = result.message;
  const conversationCycle = result.conversationCycle;
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    message,
    conversationCycle,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "message",
  });
  if (result.createdMessage) {
    await publishZapiWhatsappAttendanceEnded(
      context,
      { connection, result, transition },
      ports,
    );
    await publishZapiWhatsappAttendanceStarted(
      context,
      { attendanceTransition, connection, result },
      ports,
    );
    await enqueueCrmMessageExternalBotEvent(
      context,
      {
        connection,
        message: result.message,
        conversationCycle: result.conversationCycle,
      },
      ports,
    );
  }
  await getCrmRealtimePublisher(ports).publish({
    connectionId: connection.id,
    conversationCycle,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    type: "conversationCycle",
  });
  scheduleOptionalZapiMirroring(
    context,
    { connection, conversationCycle, message: parsed },
    ports,
  );

  return {
    message,
    conversationCycle,
    status: result.createdMessage ? "stored" : "duplicate",
  };
}

function pendingZapiMedia(message: ParsedZapiInboundMessage) {
  if (!message.mediaType || !message.mediaUrl) {
    return { metadata: message.metadata };
  }
  const current = message.metadata.media;
  return {
    metadata: {
      ...message.metadata,
      media: {
        ...(current && typeof current === "object" && !Array.isArray(current)
          ? current
          : {}),
        mirrorStatus: "pending",
      },
    },
  };
}

function scheduleOptionalZapiMirroring(
  context: ServiceContext,
  input: OptionalMirrorInput,
  ports: CrmServicePorts,
) {
  const onFailure = (stage: "media" | "profile_photo") => (error: unknown) =>
    logCrmServiceEvent(context, "crm.provider.zapi.webhook.mirror_failed", {
      connectionId: input.connection.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      stage,
    });
  void mirrorPersistedZapiMedia(input, ports).catch((error) =>
    onFailure("media")(error),
  );
  void ingestZapiProfilePhoto(
    context,
    { connection: input.connection, message: input.message },
    ports,
  )
    .then(async (result) => {
      if (result.status !== "stored" && !("conversationCycle" in result))
        return;
      await getCrmRealtimePublisher(ports).publish({
        connectionId: input.connection.id,
        conversationCycle: result.conversationCycle,
        storeId: input.connection.storeId,
        tenantId: input.connection.tenantId,
        type: "conversationCycle",
      });
    })
    .catch(onFailure("profile_photo"));
}

async function mirrorPersistedZapiMedia(
  input: OptionalMirrorInput,
  ports: CrmServicePorts,
) {
  if (!input.message.mediaType || !input.message.mediaUrl) return;
  const mirrored = await mirrorZapiWhatsappMedia({
    connectionId: input.connection.id,
    externalId: input.message.externalId,
    mediaType: input.message.mediaType,
    mediaUrl: input.message.mediaUrl,
    metadata: input.message.metadata,
    remoteMediaFetcher: ports.crmMediaFetcher ?? null,
    storage: getCrmMediaStorage(ports),
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  const repository = getCrmConversationRepository(ports);
  const existing = await repository.findMessageByExternalId({
    connectionId: input.connection.id,
    externalId: input.message.externalId,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  if (!existing) throw backgroundError("PersistedZapiMessageNotFound");
  const updated = await repository.updateMessage({
    messageId: existing.id,
    metadata: mirrored.metadata,
    ...(mirrored.mediaUrl !== undefined ? { mediaUrl: mirrored.mediaUrl } : {}),
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  if (!updated) throw backgroundError("PersistedZapiMessageUpdateFailed");
  await getCrmRealtimePublisher(ports).publish({
    connectionId: input.connection.id,
    conversationCycle: input.conversationCycle,
    message: updated,
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
    type: "message",
  });
}

function backgroundError(name: string) {
  return Object.assign(new Error(name), { name });
}
