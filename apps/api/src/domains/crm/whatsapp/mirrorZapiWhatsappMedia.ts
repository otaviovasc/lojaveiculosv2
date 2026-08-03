import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import {
  UnsafeCrmRemoteMediaUrlError,
  type CrmRemoteMediaFetcher,
} from "../ports/crmRemoteMediaFetcher.js";

export type MirrorZapiWhatsappMediaInput = {
  connectionId: string;
  externalId: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
  remoteMediaFetcher?: CrmRemoteMediaFetcher | null;
  storage?: ObjectStorage | null;
  storeId: string;
  tenantId: string;
};

export type MirrorZapiWhatsappMediaResult = {
  mediaUrl?: string;
  metadata: Record<string, unknown>;
};

const fallbackContentTypes: Record<string, string> = {
  audio: "audio/mpeg",
  document: "application/octet-stream",
  image: "image/jpeg",
  sticker: "image/webp",
  video: "video/mp4",
};

const maxBytesByMediaType: Record<string, number> = {
  audio: 25 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  image: 15 * 1024 * 1024,
  sticker: 5 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

export async function mirrorZapiWhatsappMedia(
  input: MirrorZapiWhatsappMediaInput,
): Promise<MirrorZapiWhatsappMediaResult> {
  if (!input.mediaUrl || !input.mediaType) {
    return {
      metadata: withMediaMetadata(input.metadata, {
        ...(input.mediaUrl ? { providerUrl: input.mediaUrl } : {}),
      }),
      ...(input.mediaUrl ? { mediaUrl: input.mediaUrl } : {}),
    };
  }

  if (!input.remoteMediaFetcher) {
    return {
      metadata: withSafeMediaMetadata(input.metadata, {
        mirrorErrorName: "RemoteMediaValidationUnavailable",
        mirrorStatus: "failed",
      }),
    };
  }

  try {
    if (!input.storage) {
      await input.remoteMediaFetcher.validateUrl({ url: input.mediaUrl });
      return {
        mediaUrl: input.mediaUrl,
        metadata: withMediaMetadata(input.metadata, {
          providerUrl: input.mediaUrl,
        }),
      };
    }
    const maxBytes = maxBytesByMediaType[input.mediaType] ?? 25 * 1024 * 1024;
    const remoteMedia = await input.remoteMediaFetcher.fetchMedia({
      maxBytes,
      url: input.mediaUrl,
    });
    const contentType = readContentType(remoteMedia.contentType, input);
    const body = remoteMedia.body;

    const stored = await input.storage.putObject({
      body,
      contentType,
      fileName: readMediaFileName(input, contentType),
      scopeSegments: [
        "crm",
        "whatsapp",
        input.tenantId,
        input.storeId,
        input.connectionId,
        input.externalId,
      ],
    });

    return {
      mediaUrl: stored.publicUrl,
      metadata: withMediaMetadata(input.metadata, {
        contentType,
        mirrorStatus: "stored",
        mirroredAt: new Date().toISOString(),
        providerUrl: input.mediaUrl,
        sizeBytes: body.byteLength,
        storageKey: stored.storageKey,
      }),
    };
  } catch (error) {
    if (error instanceof UnsafeCrmRemoteMediaUrlError) {
      return {
        metadata: withSafeMediaMetadata(input.metadata, {
          mirrorErrorName: error.name,
          mirrorStatus: "failed",
          unsafeUrlRejected: true,
        }),
      };
    }
    return {
      mediaUrl: input.mediaUrl,
      metadata: withMediaMetadata(input.metadata, {
        mirrorErrorName: error instanceof Error ? error.name : "UnknownError",
        mirrorStatus: "failed",
        providerUrl: input.mediaUrl,
      }),
    };
  }
}

function withSafeMediaMetadata(
  metadata: Record<string, unknown>,
  mediaUpdates: Record<string, unknown>,
) {
  const media = { ...readRecord(metadata.media) };
  delete media.providerUrl;
  delete media.thumbnailUrl;
  return {
    ...metadata,
    media: { ...media, ...mediaUpdates },
  };
}

function readContentType(
  responseContentType: string | null,
  input: MirrorZapiWhatsappMediaInput,
) {
  return (
    responseContentType?.split(";")[0]?.trim() ||
    readString(readRecord(input.metadata.media).mimeType) ||
    fallbackContentTypes[input.mediaType ?? ""] ||
    "application/octet-stream"
  );
}

function readMediaFileName(
  input: MirrorZapiWhatsappMediaInput,
  contentType: string,
) {
  const media = readRecord(input.metadata.media);
  const explicitFileName = readString(media.fileName);
  if (explicitFileName) return explicitFileName;
  const urlFileName = readUrlFileName(input.mediaUrl);
  if (urlFileName) return urlFileName;
  return `${input.externalId}.${extensionForContentType(contentType, input.mediaType)}`;
}

function readUrlFileName(url?: string) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const value = pathname.split("/").filter(Boolean).at(-1);
    return value || null;
  } catch {
    return null;
  }
}

function extensionForContentType(contentType: string, mediaType?: string) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("mpeg")) return "mp3";
  return mediaType === "sticker" ? "webp" : "bin";
}

function withMediaMetadata(
  metadata: Record<string, unknown>,
  mediaUpdates: Record<string, unknown>,
) {
  return {
    ...metadata,
    media: {
      ...readRecord(metadata.media),
      ...mediaUpdates,
    },
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
