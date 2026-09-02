import { Buffer } from "node:buffer";
import { CrmAudioNormalizationError } from "../../domains/crm/ports/crmAudioNormalizer.js";
import {
  CrmMessagingGatewayError,
  type CrmMessagingSendMediaInput,
} from "../../domains/crm/ports/crmMessagingGateway.js";
import { parsePublicHttpsUrl } from "./safeCrmRemoteMediaAddress.js";
import type { UazapiCredentials } from "./uazapiCrmWhatsappGatewaySupport.js";
import { createFfmpegUazapiAudioTranscoder } from "./uazapiCrmWhatsappAudioTranscode.js";
import type { UazapiMediaActionOptions } from "./uazapiCrmWhatsappMediaActions.js";

const UAZAPI_MAX_MEDIA_BYTES = 10 * 1024 * 1024;
const UAZAPI_MEDIA_DOWNLOAD_TIMEOUT_MS = 10_000;

/**
 * Voice notes are the load-bearing uazapi incompatibility: OGG/Opus input
 * produces undownloadable WhatsApp audio, so audio must be fetched,
 * transcoded to MP3 and sent as a base64 data URI with `async: false`.
 * Media bytes are only fetched from public https URLs so this adapter never
 * becomes an arbitrary URL fetcher; anything else is passed through to the
 * provider untouched.
 */
export async function prepareUazapiMediaFile(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmMessagingSendMediaInput,
  options: UazapiMediaActionOptions,
): Promise<{ file: string; mimetype?: string }> {
  if (input.mediaType !== "audio" || input.mediaUrl.startsWith("data:")) {
    return {
      file: input.mediaUrl,
      ...(input.mimeType ? { mimetype: input.mimeType } : {}),
    };
  }

  try {
    parsePublicHttpsUrl(input.mediaUrl);
  } catch {
    // Non-URL input (raw base64) or unsafe URLs are left for the provider.
    return {
      file: input.mediaUrl,
      ...(input.mimeType ? { mimetype: input.mimeType } : {}),
    };
  }

  const downloaded = await downloadUazapiMedia(
    credentials,
    fetchImpl,
    input.mediaUrl,
  );
  const sourceMimeType = (
    downloaded.contentType ??
    input.mimeType ??
    "audio/ogg"
  )
    .split(";", 1)[0]!
    .trim()
    .toLowerCase();
  if (!sourceMimeType.startsWith("audio/")) {
    throw new CrmMessagingGatewayError(
      `UAZAPI voice-note URL returned unsupported content type: ${sourceMimeType}`,
      409,
      undefined,
      "provider_rejected",
    );
  }

  if (sourceMimeType === "audio/mpeg") {
    return {
      file: `data:audio/mpeg;base64,${Buffer.from(downloaded.body).toString("base64")}`,
      mimetype: "audio/mpeg",
    };
  }

  const transcode =
    options.transcodeAudioToMp3 ?? createFfmpegUazapiAudioTranscoder();
  let mp3Body: Uint8Array;
  try {
    mp3Body = await transcode({
      body: downloaded.body,
      sourceMimeType,
    });
  } catch (error) {
    if (error instanceof CrmAudioNormalizationError) {
      throw new CrmMessagingGatewayError(
        "A conversao do audio para MP3 falhou. Nenhuma mensagem foi enviada.",
        error.reason === "invalid_media" ? 409 : 502,
        undefined,
        error.reason === "invalid_media"
          ? "provider_rejected"
          : "configuration_error",
      );
    }
    throw error;
  }
  return {
    file: `data:audio/mpeg;base64,${Buffer.from(mp3Body).toString("base64")}`,
    mimetype: "audio/mpeg",
  };
}

async function downloadUazapiMedia(
  credentials: UazapiCredentials,
  fetchImpl: typeof fetch,
  url: string,
): Promise<{ body: Uint8Array; contentType: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    UAZAPI_MEDIA_DOWNLOAD_TIMEOUT_MS,
  );
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "*/*" },
      method: "GET",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new CrmMessagingGatewayError(
        `UAZAPI voice-note media download failed with HTTP ${response.status}`,
        502,
        undefined,
        "request_failed",
      );
    }
    const declaredSize = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredSize) &&
      declaredSize > UAZAPI_MAX_MEDIA_BYTES
    ) {
      throw mediaTooLarge();
    }
    const body = new Uint8Array(await response.arrayBuffer());
    if (body.byteLength > UAZAPI_MAX_MEDIA_BYTES) throw mediaTooLarge();
    return {
      body,
      contentType: response.headers.get("content-type"),
    };
  } catch (error) {
    if (error instanceof CrmMessagingGatewayError) throw error;
    if (controller.signal.aborted) {
      throw new CrmMessagingGatewayError(
        "UAZAPI voice-note media download timed out",
        502,
        undefined,
        "timeout",
      );
    }
    throw new CrmMessagingGatewayError(
      "UAZAPI voice-note media download failed before receiving a response",
      502,
      undefined,
      "request_failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function mediaTooLarge() {
  return new CrmMessagingGatewayError(
    "UAZAPI voice-note media exceeds the 10MB download limit",
    409,
    undefined,
    "provider_rejected",
  );
}
