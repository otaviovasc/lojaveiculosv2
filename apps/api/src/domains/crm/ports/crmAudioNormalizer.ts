export const CRM_WHATSAPP_AUDIO_MIME_TYPE = "audio/ogg; codecs=opus";

export type CrmAudioNormalizationFailureReason =
  "invalid_media" | "output_too_large" | "runtime_unavailable" | "timeout";

export class CrmAudioNormalizationError extends Error {
  constructor(public readonly reason: CrmAudioNormalizationFailureReason) {
    super(`CRM audio normalization failed: ${reason}.`);
    this.name = "CrmAudioNormalizationError";
  }
}

export type CrmAudioNormalizer = {
  normalizeToOggOpus: (input: {
    body: Uint8Array;
    sourceMimeType: string;
  }) => Promise<Uint8Array>;
};
