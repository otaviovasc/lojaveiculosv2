import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";

export type MirrorZapiWhatsappMediaInput = {
  connectionId: string;
  externalId: string;
  mediaType?: string;
  mediaUrl?: string;
  metadata: Record<string, unknown>;
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
  if (!input.mediaUrl || !input.mediaType || !input.storage) {
    return {
      metadata: withMediaMetadata(input.metadata, {
        ...(input.mediaUrl ? { providerUrl: input.mediaUrl } : {}),
      }),
      ...(input.mediaUrl ? { mediaUrl: input.mediaUrl } : {}),
    };
  }

  try {
    const response = await fetch(input.mediaUrl);
    if (!response.ok) throw new Error(`Media fetch failed: ${response.status}`);
    const contentType = readContentType(response, input);
    const maxBytes = maxBytesByMediaType[input.mediaType] ?? 25 * 1024 * 1024;
    const contentLength = readHeaderNumber(response, "content-length");
    if (contentLength && contentLength > maxBytes) {
      throw new Error(`Media exceeds ${maxBytes} bytes`);
    }
    const body = await readLimitedBody(response, maxBytes);
    if (body.byteLength === 0)
      throw new Error("Media fetch returned empty body");

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

async function readLimitedBody(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) {
    const fallbackBody = new Uint8Array(await response.arrayBuffer());
    if (fallbackBody.byteLength > maxBytes) {
      throw new Error(`Media exceeds ${maxBytes} bytes`);
    }
    return fallbackBody;
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    totalBytes += chunk.value.byteLength;
    if (totalBytes > maxBytes)
      throw new Error(`Media exceeds ${maxBytes} bytes`);
    chunks.push(chunk.value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function readContentType(
  response: Response,
  input: MirrorZapiWhatsappMediaInput,
) {
  return (
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    readString(readRecord(input.metadata.media).mimeType) ||
    fallbackContentTypes[input.mediaType ?? ""] ||
    "application/octet-stream"
  );
}

function readHeaderNumber(response: Response, name: string) {
  const raw = response.headers.get(name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
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
