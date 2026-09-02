import { Buffer } from "node:buffer";
import { CrmMessagingGatewayError } from "../../ports/crmMessagingGateway.js";
import type {
  SendCrmMediaMessageInput,
  SendCrmMediaMessageType,
} from "./sendCrmMediaMessage.js";

export const crmMediaMessageConfig = {
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

export function decodeCrmMediaBase64(
  input: Pick<SendCrmMediaMessageInput, "base64" | "mediaType">,
): Uint8Array {
  const normalized = input.base64.includes(",")
    ? (input.base64.split(",").pop() ?? "")
    : input.base64;
  if (!normalized.trim()) {
    throw new CrmMessagingGatewayError("CRM media payload is empty.");
  }
  const buffer = Buffer.from(normalized, "base64");
  const maxBytes = crmMediaMessageConfig[input.mediaType].maxBytes;
  if (buffer.byteLength > maxBytes) {
    throw new CrmMessagingGatewayError(
      `CRM ${input.mediaType} media exceeds ${maxBytes} bytes.`,
    );
  }
  return new Uint8Array(buffer);
}

export function contentForCrmMedia(
  input: Pick<SendCrmMediaMessageInput, "caption" | "mediaType">,
  fileName: string,
) {
  const caption = input.caption?.trim();
  if (caption) return caption;
  if (input.mediaType === "document") return fileName;
  return crmMediaMessageConfig[input.mediaType].content;
}

export function leadActivityContentForCrmMedia(
  input: Pick<SendCrmMediaMessageInput, "caption" | "mediaType">,
  fileName: string,
) {
  if (input.mediaType === "document") return `Documento: ${fileName}`;
  if (input.mediaType === "image") return input.caption?.trim() || "Imagem";
  if (input.mediaType === "video") return input.caption?.trim() || "Video";
  return "Audio";
}
