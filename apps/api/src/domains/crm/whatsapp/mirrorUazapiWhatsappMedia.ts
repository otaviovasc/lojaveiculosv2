import {
  mirrorZapiWhatsappMedia,
  type MirrorZapiWhatsappMediaInput,
  type MirrorZapiWhatsappMediaResult,
} from "./mirrorZapiWhatsappMedia.js";

export type MirrorUazapiWhatsappMediaInput = MirrorZapiWhatsappMediaInput & {
  /**
   * Uazapi webhook payloads do not always carry a usable fileURL. When
   * absent, the media must be hydrated via the provider download endpoint
   * (POST /message/download) — an infrastructure concern. Callers that have
   * a provider client may supply this resolver; otherwise the message is
   * persisted without media.
   */
  resolveMediaUrl?: (() => Promise<string | null>) | null;
};

export type MirrorUazapiWhatsappMediaResult = MirrorZapiWhatsappMediaResult;

export async function mirrorUazapiWhatsappMedia(
  input: MirrorUazapiWhatsappMediaInput,
): Promise<MirrorUazapiWhatsappMediaResult> {
  let mediaUrl = input.mediaUrl;
  if (!mediaUrl && input.mediaType && input.resolveMediaUrl) {
    try {
      mediaUrl = (await input.resolveMediaUrl()) ?? undefined;
    } catch {
      mediaUrl = undefined;
    }
  }
  if (!mediaUrl && input.mediaType) {
    return {
      metadata: {
        ...input.metadata,
        media: {
          ...readMediaRecord(input.metadata),
          mirrorErrorName: "UazapiMediaUrlUnavailable",
          mirrorStatus: "failed",
        },
      },
    };
  }
  return mirrorZapiWhatsappMedia({
    ...input,
    ...(mediaUrl ? { mediaUrl } : {}),
  });
}

function readMediaRecord(metadata: Record<string, unknown>) {
  const media = metadata.media;
  return media && typeof media === "object" && !Array.isArray(media)
    ? (media as Record<string, unknown>)
    : {};
}
