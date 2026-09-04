import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConversationRepository,
  getCrmMediaStorage,
  getCrmRealtimePublisher,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  parseUazapiInboundMessage,
  type ParsedUazapiInboundMessage,
} from "../../whatsapp/parseUazapiInboundMessage.js";
import { parseUazapiAdAttribution } from "../../whatsapp/uazapiAdAttribution.js";
import { mirrorUazapiWhatsappMedia } from "../../whatsapp/mirrorUazapiWhatsappMedia.js";
import { enqueueCrmMessageExternalBotEvent } from "../../bot/externalBotEventForwarding.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
  type CrmServiceAuditInput,
} from "../CrmMessagingService/serviceSupport.js";
import type {
  IngestUazapiWhatsappWebhookInput,
  IngestUazapiWhatsappWebhookResult,
} from "../../whatsapp/ingestUazapiWhatsappWebhookTypes.js";
import {
  publishZapiWhatsappAttendanceEnded,
  publishZapiWhatsappAttendanceStarted,
} from "../../whatsapp/publishZapiWhatsappAttendance.js";
import { ingestUazapiProfilePhoto } from "../../whatsapp/uazapiProfilePhotoIngestion.js";
import { persistUazapiWhatsappWebhook } from "../../whatsapp/persistUazapiWhatsappWebhook.js";
import {
  applyInboundWhatsappReactionIfTargeted,
  markUnresolvedInboundReaction,
} from "../../whatsapp/applyInboundWhatsappReaction.js";
import { pendingInboundMediaMetadata } from "../../whatsapp/pendingInboundMedia.js";
import { readUazapiConnection } from "./uazapiWebhookSupport.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmConversationCycle } from "../../ports/crmConversationRepository.js";

const permission = "crm.messages.ingest" as const;
export type {
  IngestUazapiWhatsappWebhookInput,
  IngestUazapiWhatsappWebhookResult,
} from "../../whatsapp/ingestUazapiWhatsappWebhookTypes.js";
type OptionalMirrorInput = {
  connection: CrmConnection;
  conversationCycle: CrmConversationCycle;
  message: ParsedUazapiInboundMessage;
};

export async function ingestUazapiWhatsappWebhook(
  context: ServiceContext,
  input: IngestUazapiWhatsappWebhookInput,
  ports: CrmServicePorts,
): Promise<IngestUazapiWhatsappWebhookResult> {
  assertPermission(context, permission);
  const connection = await readUazapiConnection(
    context,
    input.connectionId,
    ports,
  );
  if (!connection) return { reason: "connection_not_found", status: "ignored" };

  const detectedAt = new Date();
  const attribution = parseUazapiAdAttribution(input.payload, { detectedAt });
  const parsed = parseUazapiInboundMessage(input.payload);
  if (!parsed) {
    return { reason: "not_processable", status: "ignored" };
  }
  const reaction = await applyInboundWhatsappReactionIfTargeted(
    context,
    { connection, parsed, provider: "uazapi" },
    ports,
  );
  if (reaction) return reaction;
  markUnresolvedInboundReaction(parsed.metadata);
  const media = pendingInboundMediaMetadata(parsed, { requireMediaUrl: false });
  const profilePhoto = { status: "unavailable" as const };
  const auditInput: CrmServiceAuditInput = {
    action: "crm.provider.uazapi.webhook.received",
    category: "data_change" as const,
    entityId: connection.id,
    entityType: "crm_whatsapp_connection",
    metadata: { externalId: parsed.externalId },
    permission,
    storeId: connection.storeId,
    summary: "Ingested Uazapi WhatsApp webhook",
    tenantId: connection.tenantId,
  };
  const persisted = await recordCrmServiceMutation(context, auditInput, () =>
    persistUazapiWhatsappWebhook(
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
  scheduleOptionalUazapiMirroring(
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

function scheduleOptionalUazapiMirroring(
  context: ServiceContext,
  input: OptionalMirrorInput,
  ports: CrmServicePorts,
) {
  const onFailure = (stage: "media" | "profile_photo") => (error: unknown) =>
    logCrmServiceEvent(context, "crm.provider.uazapi.webhook.mirror_failed", {
      connectionId: input.connection.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      stage,
    });
  void mirrorPersistedUazapiMedia(input, ports).catch((error) =>
    onFailure("media")(error),
  );
  void ingestUazapiProfilePhoto(
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

async function mirrorPersistedUazapiMedia(
  input: OptionalMirrorInput,
  ports: CrmServicePorts,
) {
  if (!input.message.mediaType) return;
  const gateway = ports.crmMessagingGateway;
  const mirrored = await mirrorUazapiWhatsappMedia({
    connectionId: input.connection.id,
    externalId: input.message.externalId,
    mediaType: input.message.mediaType,
    ...(input.message.mediaUrl ? { mediaUrl: input.message.mediaUrl } : {}),
    metadata: input.message.metadata,
    remoteMediaFetcher: ports.crmMediaFetcher ?? null,
    ...(gateway?.downloadInboundMedia
      ? {
          resolveMediaUrl: async () =>
            (
              await gateway.downloadInboundMedia!(input.connection, {
                messageId: input.message.externalId,
              })
            ).mediaUrl,
        }
      : {}),
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
  if (!existing) throw backgroundError("PersistedUazapiMessageNotFound");
  const updated = await repository.updateMessage({
    messageId: existing.id,
    metadata: mirrored.metadata,
    ...(mirrored.mediaUrl !== undefined ? { mediaUrl: mirrored.mediaUrl } : {}),
    storeId: input.connection.storeId,
    tenantId: input.connection.tenantId,
  });
  if (!updated) throw backgroundError("PersistedUazapiMessageUpdateFailed");
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
