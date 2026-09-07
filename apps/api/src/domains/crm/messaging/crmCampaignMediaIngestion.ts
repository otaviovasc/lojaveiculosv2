import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";
import {
  decodeStrictCrmMediaBase64,
  maxCrmMediaBase64Length,
} from "../services/CrmMessagingService/sendCrmMediaMessageSupport.js";
import {
  getCrmMediaStorage,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export const MAX_CAMPAIGN_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MiB
// Base64 expands by 4/3. The data URI prefix is checked separately by the
// strict shared decoder and is deliberately not counted as media bytes.
export const MAX_CAMPAIGN_MEDIA_BASE64_LENGTH = maxCrmMediaBase64Length(
  MAX_CAMPAIGN_MEDIA_BYTES,
);

export type IngestCampaignMediaInput = {
  mediaBase64?: string | null;
  mediaFileName?: string | null;
  mediaType?: string | null;
};

export type IngestCampaignMediaResult = {
  mediaUrl: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  storageKey: string | null;
};

type ImageFormat = {
  extension: string;
  mimeType: string;
};

export async function ingestCampaignMedia(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: IngestCampaignMediaInput,
): Promise<IngestCampaignMediaResult> {
  const rawBase64 = input.mediaBase64?.trim();
  if (!rawBase64) {
    return {
      mediaFileName: null,
      mediaType: null,
      mediaUrl: null,
      storageKey: null,
    };
  }

  const dataUriMimeType = readDataUriMimeType(rawBase64);

  let buffer: Uint8Array;
  try {
    buffer = decodeStrictCrmMediaBase64({
      base64: rawBase64,
      maxBytes: MAX_CAMPAIGN_MEDIA_BYTES,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("exceeds its byte limit")) {
      throw new CrmMessageActionError("Campaign image exceeds 10MB limit.");
    }
    if (message.includes("empty")) {
      throw new CrmMessageActionError("Campaign media payload is empty.");
    }
    throw new CrmMessageActionError(
      "Campaign media payload is not valid base64.",
    );
  }

  // Strict magic byte sniffing: NEVER fall back to hint MIME
  const format = detectImageFormatFromBytes(Buffer.from(buffer));
  if (!format) {
    throw new CrmMessageActionError(
      "Unsupported image format. Allowed formats: JPEG, PNG, WebP, GIF.",
    );
  }

  // Explicit policy on hinted MIME mismatch: caller hint must match sniffed byte format
  const declaredMimeTypes = [
    ...(input.mediaType ? [normalizeMimeType(input.mediaType)] : []),
    ...(dataUriMimeType ? [dataUriMimeType] : []),
  ];
  if (declaredMimeTypes.some((mimeType) => mimeType !== format.mimeType)) {
    throw new CrmMessageActionError(
      `Declared MIME type does not match detected format "${format.mimeType}".`,
    );
  }

  const storage = getCrmMediaStorage(ports);
  if (!storage) {
    throw new CrmMessageActionError("CRM media storage is not configured.");
  }

  const scope = requireCrmMessagingScope(context);
  // Server filename extension strictly matches the validated MIME format
  const sanitizedName = sanitizeFileNameWithExtension(
    input.mediaFileName,
    format.extension,
  );

  const stored = await storage.putObject({
    body: new Uint8Array(buffer),
    contentType: format.mimeType,
    fileName: sanitizedName,
    scopeSegments: ["crm", "campaigns", scope.tenantId, scope.storeId],
  });

  return {
    mediaFileName: sanitizedName,
    mediaType: format.mimeType,
    mediaUrl: stored.publicUrl,
    storageKey: stored.storageKey,
  };
}

/**
 * Sniffs image format strictly from header magic bytes.
 * Returns null if bytes do not match PNG, JPEG, GIF, or WebP signatures.
 */
export function detectImageFormatFromBytes(buffer: Buffer): ImageFormat | null {
  if (buffer.length >= 8 && isPng(buffer)) {
    return { extension: "png", mimeType: "image/png" };
  }
  if (buffer.length >= 3 && isJpeg(buffer)) {
    return { extension: "jpg", mimeType: "image/jpeg" };
  }
  if (buffer.length >= 6 && isGif(buffer)) {
    return { extension: "gif", mimeType: "image/gif" };
  }
  if (buffer.length >= 12 && isWebp(buffer)) {
    return { extension: "webp", mimeType: "image/webp" };
  }
  return null;
}

function isPng(buffer: Buffer): boolean {
  return buffer
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
}

function isGif(buffer: Buffer): boolean {
  const header = buffer.subarray(0, 6).toString("ascii");
  return header === "GIF87a" || header === "GIF89a";
}

function isWebp(buffer: Buffer): boolean {
  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");
  return riff === "RIFF" && webp === "WEBP";
}

function readDataUriMimeType(value: string): string | null {
  const match = value.match(/^data:([^;,]+);base64,/i);
  return match?.[1] ? normalizeMimeType(match[1]) : null;
}

function normalizeMimeType(value: string): string {
  const mimeType = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

/**
 * Strips any user-provided extension and forces the extension corresponding to the validated MIME format.
 */
export function sanitizeFileNameWithExtension(
  name: string | null | undefined,
  extension: string,
): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return `campaign-image-${randomUUID()}.${extension}`;
  }
  const basename = trimmed.split(/[/\\\\]+/).pop() ?? "";
  const dotIndex = basename.lastIndexOf(".");
  const stem = dotIndex > 0 ? basename.slice(0, dotIndex) : basename;
  const cleaned = stem.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (!cleaned) {
    return `campaign-image-${randomUUID()}.${extension}`;
  }
  return `${cleaned}.${extension}`;
}
