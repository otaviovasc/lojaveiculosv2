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

/**
 * Return the largest canonical base64 payload that can represent `maxBytes`.
 * This is used before allocating a decoded Buffer. A data URI prefix is
 * intentionally excluded because it is metadata, not encoded media bytes.
 */
export function maxCrmMediaBase64Length(maxBytes: number) {
  return 4 * Math.ceil(maxBytes / 3);
}

/**
 * Decode a base64 media payload without relying on Buffer's permissive parser.
 * The regular media-send path keeps its historical provider-specific policy;
 * campaign ingestion uses this strict shared decoder for managed uploads.
 */
export function decodeStrictCrmMediaBase64(input: {
  base64: string;
  maxBytes: number;
}): Uint8Array {
  const encoded = input.base64.trim();
  const normalizedSource = encoded.startsWith("data:")
    ? (encoded.match(/^data:[^;,]+;base64,(.*)$/is)?.[1] ?? null)
    : encoded.includes(",")
      ? null
      : encoded;
  if (!normalizedSource?.trim()) {
    throw new CrmMessagingGatewayError("CRM media payload is empty.");
  }

  const normalized = normalizedSource.replace(/\s+/g, "");
  const maxEncodedLength = maxCrmMediaBase64Length(input.maxBytes);
  if (normalized.length > maxEncodedLength) {
    throw new CrmMessagingGatewayError(
      "CRM media payload exceeds its byte limit.",
    );
  }

  // Padding may only occur at the end; unpadded base64 is accepted for
  // browser/client compatibility, while a one-character remainder is never
  // valid base64. Padded input must contain a complete four-character group.
  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) ||
    normalized.length % 4 === 1 ||
    (normalized.includes("=") && normalized.length % 4 !== 0)
  ) {
    throw new CrmMessagingGatewayError(
      "CRM media payload is not valid base64.",
    );
  }

  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const buffer = Buffer.from(padded, "base64");
  if (buffer.byteLength === 0) {
    throw new CrmMessagingGatewayError("CRM media payload is empty.");
  }
  if (buffer.byteLength > input.maxBytes) {
    throw new CrmMessagingGatewayError(
      "CRM media payload exceeds its byte limit.",
    );
  }
  const canonical = buffer.toString("base64");
  if (
    canonical.replace(/=+$/, "") !== normalized.replace(/=+$/, "") ||
    (normalized.includes("=") && canonical !== normalized)
  ) {
    throw new CrmMessagingGatewayError(
      "CRM media payload is not valid base64.",
    );
  }
  return new Uint8Array(buffer);
}

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
