import { Buffer } from "node:buffer";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { CrmWhatsappGatewayError } from "../../ports/crmWhatsappGateway.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { sendWhatsappOutboundMessage } from "../../whatsapp/sendWhatsappOutboundMessage.js";
import {
  getCrmWhatsappMediaStorage,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

export type SendWhatsappMediaType = "audio" | "document" | "image" | "video";

export type SendWhatsappMediaInput = {
  base64: string;
  caption?: string;
  fileName?: string;
  mediaType: SendWhatsappMediaType;
  mimeType?: string;
  sessionId: string;
};

const mediaConfig = {
  audio: {
    content: "[audio]",
    fallbackFileName: "whatsapp-audio.ogg",
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
    fallbackFileName: "whatsapp-image.jpg",
    fallbackMimeType: "image/jpeg",
    maxBytes: 15 * 1024 * 1024,
    messageType: "IMAGE",
  },
  video: {
    content: "[video]",
    fallbackFileName: "whatsapp-video.mp4",
    fallbackMimeType: "video/mp4",
    maxBytes: 100 * 1024 * 1024,
    messageType: "VIDEO",
  },
} as const satisfies Record<
  SendWhatsappMediaType,
  {
    content: string;
    fallbackFileName: string;
    fallbackMimeType: string;
    maxBytes: number;
    messageType: "AUDIO" | "DOCUMENT" | "IMAGE" | "VIDEO";
  }
>;

const permission = "crm.whatsapp.send";

export async function sendWhatsappMedia(
  context: ServiceContext,
  input: SendWhatsappMediaInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  const body = decodeMediaBase64(input);
  logWhatsappServiceEvent(context, "crm.whatsapp.message.send_media.started", {
    mediaType: input.mediaType,
    sessionId: input.sessionId,
    sizeBytes: body.byteLength,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.message.send_media",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: {
        hasCaption: Boolean(input.caption?.trim()),
        mediaType: input.mediaType,
        sizeBytes: body.byteLength,
      },
      permission,
      summary: "Sent CRM WhatsApp media message",
    },
    () =>
      sendWhatsappOutboundMessage(
        context,
        {
          prepare: async ({ connection, gateway, phone, scope, session }) => {
            const storage = getCrmWhatsappMediaStorage(ports);
            if (!storage) {
              throw new CrmWhatsappGatewayError(
                "CRM WhatsApp media storage is not configured.",
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
                "whatsapp",
                scope.tenantId,
                scope.storeId,
                connection.id,
                session.id,
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
                  raw: sent.raw,
                  sentByActorId: context.actor.id,
                },
                sent,
                type: config.messageType,
              };
            } catch (error) {
              await storage
                .deleteObject?.({ storageKey: stored.storageKey })
                .catch((cleanupError) => {
                  context.logger.warn("crm.whatsapp.media.cleanup.failed", {
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
          sessionId: input.sessionId,
        },
        ports,
      ),
  );
}

function decodeMediaBase64(input: SendWhatsappMediaInput): Uint8Array {
  const normalized = input.base64.includes(",")
    ? (input.base64.split(",").pop() ?? "")
    : input.base64;
  if (!normalized.trim()) {
    throw new CrmWhatsappGatewayError("CRM WhatsApp media payload is empty.");
  }
  const buffer = Buffer.from(normalized, "base64");
  const maxBytes = mediaConfig[input.mediaType].maxBytes;
  if (buffer.byteLength > maxBytes) {
    throw new CrmWhatsappGatewayError(
      `CRM WhatsApp ${input.mediaType} media exceeds ${maxBytes} bytes.`,
    );
  }
  return new Uint8Array(buffer);
}

function contentForMedia(input: SendWhatsappMediaInput, fileName: string) {
  const caption = input.caption?.trim();
  if (caption) return caption;
  if (input.mediaType === "document") return fileName;
  return mediaConfig[input.mediaType].content;
}

function leadActivityContent(input: SendWhatsappMediaInput, fileName: string) {
  if (input.mediaType === "document") return `Documento: ${fileName}`;
  if (input.mediaType === "image") return input.caption?.trim() || "Imagem";
  if (input.mediaType === "video") return input.caption?.trim() || "Video";
  return "Audio";
}
