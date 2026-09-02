import { assertPermission } from "../../../../shared/authorization.js";
import { createHash } from "node:crypto";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { CrmMessagingGatewayError } from "../../ports/crmMessagingGateway.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import { sendOutboundMessage } from "../../messaging/sendOutboundMessage.js";
import {
  getCrmMediaStorage,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";
import { prepareCrmOutboundMedia } from "../../messaging/crmOutboundMediaPreparation.js";
import { replyMetadata, resolveReplyTarget } from "./sendMessage.js";
import {
  contentForCrmMedia,
  crmMediaMessageConfig,
  decodeCrmMediaBase64,
  leadActivityContentForCrmMedia,
} from "./sendCrmMediaMessageSupport.js";

export type SendCrmMediaMessageType = "audio" | "document" | "image" | "video";
export type SendCrmMediaMessageInput = {
  base64: string;
  caption?: string;
  fileName?: string;
  idempotencyKey?: string;
  mediaType: SendCrmMediaMessageType;
  mimeType?: string;
  /** CRM message id of the quoted message, when replying. */
  replyToMessageId?: string;
  cycleId: string;
};
const permission = "crm.messages.send";
export async function sendCrmMediaMessage(
  context: ServiceContext,
  input: SendCrmMediaMessageInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  const body = decodeCrmMediaBase64(input);
  logCrmServiceEvent(context, "crm.message.send_media.started", {
    mediaType: input.mediaType,
    cycleId: input.cycleId,
    sizeBytes: body.byteLength,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: "crm.message.send_media",
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: {
        hasCaption: Boolean(input.caption?.trim()),
        mediaType: input.mediaType,
        sizeBytes: body.byteLength,
      },
      permission,
      summary: "Sent CRM media message",
    },
    () =>
      sendOutboundMessage(
        context,
        {
          ...(input.idempotencyKey
            ? { idempotencyKey: input.idempotencyKey }
            : {}),
          idempotencyPayload: {
            caption: input.caption ?? null,
            fileName: input.fileName ?? null,
            mediaType: input.mediaType,
            payloadDigest: createHash("sha256").update(body).digest("hex"),
            mimeType: input.mimeType ?? null,
            replyToMessageId: input.replyToMessageId ?? null,
            cycleId: input.cycleId,
          },
          senderOrigin: "human_crm",
          prepare: async ({
            connection,
            gateway,
            phone,
            scope,
            conversationCycle,
          }) => {
            const storage = getCrmMediaStorage(ports);
            if (!storage) {
              throw new CrmMessagingGatewayError(
                "CRM media storage is not configured.",
              );
            }
            const config = crmMediaMessageConfig[input.mediaType];
            const replyTo = input.replyToMessageId
              ? await resolveReplyTarget(context, {
                  messageId: input.replyToMessageId,
                  ports,
                  cycleId: input.cycleId,
                })
              : null;
            const media = await prepareCrmOutboundMedia({
              body,
              fallbackFileName: config.fallbackFileName,
              fallbackMimeType: config.fallbackMimeType,
              fileName: input.fileName,
              maxBytes: config.maxBytes,
              mediaType: input.mediaType,
              mimeType: input.mimeType,
              ports,
            });
            const stored = await storage.putObject({
              body: media.body,
              contentType: media.mimeType,
              fileName: media.fileName,
              scopeSegments: [
                "crm",
                connection.channel,
                scope.tenantId,
                scope.storeId,
                connection.id,
                conversationCycle.id,
                "outbound",
              ],
            });
            try {
              const sent = await gateway.sendMedia(connection, {
                ...(input.mediaType === "video"
                  ? { asyncProcessing: true }
                  : {}),
                ...(input.caption?.trim()
                  ? { caption: input.caption.trim() }
                  : {}),
                ...(replyTo?.externalId
                  ? { replyToMessageId: replyTo.externalId }
                  : {}),
                fileName: media.fileName,
                mediaType: input.mediaType,
                mediaUrl: stored.publicUrl,
                mimeType: media.mimeType,
                phone,
              });
              return {
                content: contentForCrmMedia(input, media.fileName),
                leadActivityContent: leadActivityContentForCrmMedia(
                  input,
                  media.fileName,
                ),
                mediaType: input.mediaType,
                mediaUrl: stored.publicUrl,
                metadata: {
                  media: {
                    ...(input.mediaType === "video"
                      ? {
                          asyncProcessing: true,
                          videoProcessingStage: "SUBMITTED",
                        }
                      : {}),
                    ...(input.caption?.trim()
                      ? { caption: input.caption.trim() }
                      : {}),
                    fileName: media.fileName,
                    mimeType: media.mimeType,
                    normalizedForWhatsapp: input.mediaType === "audio",
                    originalMimeType:
                      input.mimeType?.trim() || config.fallbackMimeType,
                    sizeBytes: media.body.byteLength,
                    storageKey: stored.storageKey,
                  },
                  provider: connection.provider,
                  ...(replyTo ? { replyTo: replyMetadata(replyTo) } : {}),
                  sentByActorId: context.actor.id,
                },
                sent,
                type: config.messageType,
              };
            } catch (error) {
              await storage
                .deleteObject?.({ storageKey: stored.storageKey })
                .catch((cleanupError) => {
                  context.logger.warn("crm.media.cleanup.failed", {
                    errorName:
                      cleanupError instanceof Error
                        ? cleanupError.name
                        : "UnknownError",
                    requestId: context.requestId,
                    storageKey: stored.storageKey,
                  });
                });
              throw error;
            }
          },
          requiredCapabilities: ["outbound", "media"],
          cycleId: input.cycleId,
        },
        ports,
      ),
  );
}
