import type { CrmRemoteMediaFetcher } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import { UnsafeCrmRemoteMediaUrlError } from "../../../domains/crm/ports/crmRemoteMediaFetcher.js";
import type { CrmAudioNormalizer } from "../../../domains/crm/ports/crmAudioNormalizer.js";
import { normalizeCrmAudio } from "../../../domains/crm/messaging/crmAudioNormalization.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import {
  persistPreparedExternalBotMedia,
  type AuthorizedExternalBotEffect,
} from "../../db/crm/drizzleExternalBotEffectRuntime.js";

const maxBytesByMediaType: Record<string, number> = {
  audio: 25 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  image: 15 * 1024 * 1024,
  video: 100 * 1024 * 1024,
};

const fallbackContentTypes: Record<string, string> = {
  audio: "audio/mpeg",
  document: "application/octet-stream",
  image: "image/jpeg",
  video: "video/mp4",
};

type PreparationDb = Parameters<typeof persistPreparedExternalBotMedia>[0];

export async function prepareExternalBotMedia(input: {
  audioNormalizer?: CrmAudioNormalizer;
  db: PreparationDb;
  effect: AuthorizedExternalBotEffect;
  logger: ServiceLogger;
  mediaFetcher?: CrmRemoteMediaFetcher;
  mediaStorage?: ObjectStorage;
}) {
  const { effect } = input;
  if (effect.command.action !== "message.send_media") {
    return;
  }
  if (effect.preparedMedia) return;
  if (!input.mediaFetcher || !input.mediaStorage) {
    throw preparationError(
      "configuration_error",
      "External bot media storage is not configured.",
    );
  }

  let storageKey: string | null = null;
  try {
    const media = await input.mediaFetcher.fetchMedia({
      maxBytes:
        maxBytesByMediaType[effect.command.payload.mediaType] ??
        25 * 1024 * 1024,
      url: effect.command.payload.mediaUrl,
    });
    const sourceContentType =
      media.contentType?.split(";")[0]?.trim() ||
      fallbackContentTypes[effect.command.payload.mediaType] ||
      "application/octet-stream";
    const prepared =
      effect.command.payload.mediaType === "audio"
        ? await normalizeCrmAudio({
            body: media.body,
            fileName: mediaFileName(
              media.finalUrl,
              sourceContentType,
              effect.effectId,
            ),
            maxBytes: maxBytesByMediaType.audio!,
            normalizer: requireAudioNormalizer(input.audioNormalizer),
            sourceMimeType: sourceContentType,
          })
        : {
            body: media.body,
            fileName: mediaFileName(
              media.finalUrl,
              sourceContentType,
              effect.effectId,
            ),
            mimeType: sourceContentType,
          };
    const stored = await input.mediaStorage.putObject({
      body: prepared.body,
      contentType: prepared.mimeType,
      fileName: prepared.fileName,
      idempotencyKey: effect.effectId,
      scopeSegments: [
        "crm",
        effectChannel(effect),
        effect.tenantId,
        effect.storeId,
        effect.providerConnectionId,
        effect.canonicalCycleId,
        "outbound",
        "external-bot",
        effect.effectId,
      ],
    });
    storageKey = stored.storageKey;
    await persistPreparedExternalBotMedia(input.db, {
      contentType: prepared.mimeType,
      effectId: effect.effectId,
      originalUrl: effect.command.payload.mediaUrl,
      publicUrl: stored.publicUrl,
      sizeBytes: prepared.body.byteLength,
      storageKey: stored.storageKey,
      storeId: effect.storeId,
      tenantId: effect.tenantId,
    });
  } catch (error) {
    if (storageKey && failureCode(error) !== "media_preparation_conflict") {
      await cleanupStoredMedia(input, storageKey);
    }
    throw classifyPreparationError(error);
  }
}

function requireAudioNormalizer(normalizer: CrmAudioNormalizer | undefined) {
  if (normalizer) return normalizer;
  throw preparationError(
    "configuration_error",
    "External bot audio normalization is not configured.",
  );
}

function failureCode(error: unknown) {
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

async function cleanupStoredMedia(
  input: Pick<
    Parameters<typeof prepareExternalBotMedia>[0],
    "logger" | "mediaStorage"
  >,
  storageKey: string,
) {
  await input.mediaStorage?.deleteObject?.({ storageKey }).catch((error) => {
    input.logger.warn("crm.bot.media.cleanup.failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      storageKey,
    });
  });
}

function effectChannel(effect: AuthorizedExternalBotEffect) {
  const channel = effect.connection.canonical?.channel;
  if (!channel) {
    throw preparationError(
      "configuration_error",
      "External bot CRM channel connection is unavailable.",
    );
  }
  return channel;
}

function mediaFileName(url: string, contentType: string, effectId: string) {
  try {
    const value = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    if (value?.includes(".")) return value;
  } catch {
    // The safe fetcher already validated the source; use the typed fallback.
  }
  return `${effectId}.${extensionForContentType(contentType)}`;
}

function extensionForContentType(contentType: string) {
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("pdf")) return "pdf";
  return "bin";
}

function classifyPreparationError(error: unknown) {
  if (failureCode(error)) return error;
  if (
    error instanceof UnsafeCrmRemoteMediaUrlError ||
    ["RemoteMediaTooLargeError", "RemoteMediaEmptyBodyError"].includes(
      error instanceof Error ? error.name : "",
    )
  ) {
    return preparationError(
      "validation_failed",
      "External bot media is invalid.",
    );
  }
  if (error instanceof Error && error.name === "RemoteMediaFetchError") {
    return preparationError(
      "provider_rejected",
      "External bot media source rejected the download.",
    );
  }
  return preparationError(
    "provider_unavailable",
    "External bot media could not be prepared.",
  );
}

function preparationError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}
