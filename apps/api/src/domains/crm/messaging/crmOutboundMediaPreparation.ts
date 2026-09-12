import type { CrmServicePorts } from "../services/CrmService/types.js";
import type { SendCrmMediaMessageType } from "../services/CrmMessagingService/sendCrmMediaMessage.js";
import {
  normalizeCrmAudio,
  requireCrmAudioNormalizer,
} from "./crmAudioNormalization.js";

export function prepareCrmOutboundMedia(input: {
  body: Uint8Array;
  fallbackFileName: string;
  fallbackMimeType: string;
  fileName?: string | undefined;
  maxBytes: number;
  mediaType: SendCrmMediaMessageType;
  mimeType?: string | undefined;
  ports: CrmServicePorts;
}) {
  const fileName = input.fileName?.trim() || input.fallbackFileName;
  const mimeType = input.mimeType?.trim() || input.fallbackMimeType;
  if (input.mediaType !== "audio") {
    return Promise.resolve({ body: input.body, fileName, mimeType });
  }
  return normalizeCrmAudio({
    body: input.body,
    fileName,
    maxBytes: input.maxBytes,
    normalizer: requireCrmAudioNormalizer(input.ports),
    sourceMimeType: mimeType,
  });
}
