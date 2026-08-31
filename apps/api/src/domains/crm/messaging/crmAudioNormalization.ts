import {
  CRM_WHATSAPP_AUDIO_MIME_TYPE,
  CrmAudioNormalizationError,
  type CrmAudioNormalizer,
} from "../ports/crmAudioNormalizer.js";
import { CrmMessagingGatewayError } from "../ports/crmMessagingGateway.js";
import type { CrmServicePorts } from "../services/CrmService/types.js";

export function requireCrmAudioNormalizer(
  ports: Pick<CrmServicePorts, "crmAudioNormalizer">,
) {
  if (ports.crmAudioNormalizer) return ports.crmAudioNormalizer;
  throw new CrmMessagingGatewayError(
    "A normalizacao de audio esta indisponivel. Nenhuma mensagem foi enviada.",
    502,
    undefined,
    "configuration_error",
  );
}

export async function normalizeCrmAudio(input: {
  body: Uint8Array;
  fileName: string;
  maxBytes: number;
  normalizer: CrmAudioNormalizer;
  sourceMimeType: string;
}) {
  let body: Uint8Array;
  try {
    body = await input.normalizer.normalizeToOggOpus({
      body: input.body,
      sourceMimeType: input.sourceMimeType,
    });
  } catch (error) {
    if (error instanceof CrmAudioNormalizationError) {
      if (error.reason === "output_too_large") {
        throw new CrmMessagingGatewayError(
          "O audio convertido excede o limite permitido. Nenhuma mensagem foi enviada.",
          409,
          undefined,
          "provider_rejected",
        );
      }
      if (error.reason !== "invalid_media") {
        throw new CrmMessagingGatewayError(
          "A normalizacao de audio esta indisponivel. Nenhuma mensagem foi enviada.",
          502,
          undefined,
          "configuration_error",
        );
      }
      throw new CrmMessagingGatewayError(
        "O audio nao pode ser convertido para um formato compativel com o WhatsApp. Nenhuma mensagem foi enviada.",
        409,
        undefined,
        "provider_rejected",
      );
    }
    throw new CrmMessagingGatewayError(
      "A normalizacao de audio esta indisponivel. Nenhuma mensagem foi enviada.",
      502,
      undefined,
      "configuration_error",
    );
  }
  if (!body.byteLength || body.byteLength > input.maxBytes) {
    throw new CrmMessagingGatewayError(
      "O audio convertido excede o limite permitido. Nenhuma mensagem foi enviada.",
      409,
      undefined,
      "provider_rejected",
    );
  }
  return {
    body,
    fileName: oggFileName(input.fileName),
    mimeType: CRM_WHATSAPP_AUDIO_MIME_TYPE,
  };
}

export function assertCrmAudioIsNormalized(mimeType: string | null) {
  if (mimeType?.trim().toLowerCase() === CRM_WHATSAPP_AUDIO_MIME_TYPE) return;
  throw new CrmMessagingGatewayError(
    "Este audio foi salvo em um formato antigo e incompativel com o WhatsApp. Reenvie o audio antes de tentar novamente.",
    409,
    undefined,
    "provider_rejected",
  );
}

function oggFileName(fileName: string) {
  const trimmed = fileName.trim();
  const stem = trimmed.replace(/\.[^./\\]+$/, "") || "crm-audio";
  return `${stem}.ogg`;
}
