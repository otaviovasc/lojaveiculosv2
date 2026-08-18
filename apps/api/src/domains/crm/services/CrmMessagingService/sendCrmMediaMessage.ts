import { Buffer } from "node:buffer";
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

export type SendCrmMediaMessageType = "audio" | "document" | "image" | "video";

export type SendCrmMediaMessageInput = {
  base64: string;
  caption?: string;
  fileName?: string;
  idempotencyKey?: string;
  mediaType: SendCrmMediaMessageType;
  mimeType?: string;
  cycleId: string;
};

const mediaConfig = {
  audio: {
    content: "[audio]",
    fallbackFileName: "crm-audio.ogg",
    fallbackMimeType: "audio/ogg",
    maxBytes: 25 * 1024 * 1024,
    messageType: "AUDIO",
  },
  document: {
    content: "Documento",
    fallbackFileName: "documento.pdf",
    fallbackMimeType: "application/octet-stream",
    maxBytes: 25 * 1024 * 1024,
    messageType: "DOCUMENT",
  },
  image: {
    content: "[image]",
    fallbackFileName: "crm-image.jpg",
    fallbackMimeType: "image/jpeg",
    maxBytes: 15 * 1024 * 1024,
    messageType: "IMAGE",
  },
  video: {
    content: "[video]",
    fallbackFileName: "crm-video.mp4",
    fallbackMimeType: "video/mp4",
    maxBytes: 100 * 1024 * 1024,
    messageType: "VIDEO",
  },
} as const satisfies Record<
  SendCrmMediaMessageType,
  {
    content: string;
    fallbackFileName: string;
    fallbackMimeType: string;
    maxBytes: number;
    messageType: "AUDIO" | "DOCUMENT" | "IMAGE" | "VIDEO";
  }
>;

const permission = "crm.messages.send";

export async function sendCrmMediaMessage(
  context: ServiceContext,
  input: SendCrmMediaMessageInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  assertPermission(context, permission);
  const body = decodeMediaBase64(input);
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
            const config = mediaConfig[input.mediaType];
            const fileName = input.fileName?.trim() || config.fallbackFileName;
            const mimeType = input.mimeType?.trim() || config.fallbackMimeType;
            const stored = await storage.putObject({
              body,
              contentType: mimeType,
              fileName,
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
                fileName,
                mediaType: input.mediaType,
                mediaUrl: stored.publicUrl,
                mimeType,
                phone,
              });
              return {
                content: contentForMedia(input, fileName),
                leadActivityContent: leadActivityContent(input, fileName),
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
                    fileName,
                    mimeType,
                    sizeBytes: body.byteLength,
                    storageKey: stored.storageKey,
                  },
                  provider: connection.provider,
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

function decodeMediaBase64(input: SendCrmMediaMessageInput): Uint8Array {
  const normalized = input.base64.includes(",")
    ? (input.base64.split(",").pop() ?? "")
    : input.base64;
  if (!normalized.trim()) {
    throw new CrmMessagingGatewayError("CRM media payload is empty.");
  }
  const buffer = Buffer.from(normalized, "base64");
  const maxBytes = mediaConfig[input.mediaType].maxBytes;
  if (buffer.byteLength > maxBytes) {
    throw new CrmMessagingGatewayError(
      `CRM ${input.mediaType} media exceeds ${maxBytes} bytes.`,
    );
  }
  return new Uint8Array(buffer);
}

function contentForMedia(input: SendCrmMediaMessageInput, fileName: string) {
  const caption = input.caption?.trim();
  if (caption) return caption;
  if (input.mediaType === "document") return fileName;
  return mediaConfig[input.mediaType].content;
}

function leadActivityContent(
  input: SendCrmMediaMessageInput,
  fileName: string,
) {
  if (input.mediaType === "document") return `Documento: ${fileName}`;
  if (input.mediaType === "image") return input.caption?.trim() || "Imagem";
  if (input.mediaType === "video") return input.caption?.trim() || "Video";
  return "Audio";
}
