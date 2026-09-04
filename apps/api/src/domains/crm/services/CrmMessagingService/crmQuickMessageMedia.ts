import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { CrmAudioNormalizer } from "../../ports/crmAudioNormalizer.js";
import { CrmMessagingGatewayError } from "../../ports/crmMessagingGateway.js";
import type { CrmQuickMessageKind } from "../../ports/crmConversationRepository.js";
import { normalizeCrmAudio } from "../../messaging/crmAudioNormalization.js";

const mediaPolicy = {
  AUDIO: {
    fallbackFileName: "quick-audio.ogg",
    maxBytes: 15 * 1024 * 1024,
    mimePrefix: "audio/",
    path: "audio",
  },
  IMAGE: {
    fallbackFileName: "quick-image.jpg",
    maxBytes: 12 * 1024 * 1024,
    mimePrefix: "image/",
    path: "images",
  },
} as const;

export type StoredQuickMessageMedia = {
  mediaType: string;
  mediaUrl: string;
  storageKey: string;
};

export async function deleteQuickMessageMedia(
  context: ServiceContext,
  storage: ObjectStorage | null,
  storageKey: string | null,
) {
  if (!storage || !storageKey) return;
  await storage.deleteObject?.({ storageKey }).catch((error) => {
    context.logger.warn("crm.quick_message.media_cleanup.failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId: context.requestId,
      storageKey,
    });
  });
}

export async function storeQuickMessageMedia(input: {
  base64?: string;
  fileName?: string;
  kind: CrmQuickMessageKind;
  mediaType?: string;
  normalizer: CrmAudioNormalizer | null;
  scope: { storeId: string; tenantId: string };
  storage: ObjectStorage | null;
}) {
  if (input.kind === "TEXT") return null;
  const policy = mediaPolicy[input.kind];
  const sourceMimeType = input.mediaType?.trim() ?? "";
  if (!sourceMimeType.split(";")[0]?.trim().startsWith(policy.mimePrefix)) {
    throw new CrmMessagingGatewayError(
      `CRM WhatsApp quick message ${input.kind.toLowerCase()} media type is invalid.`,
    );
  }
  if (!input.storage) {
    throw new CrmMessagingGatewayError(
      "CRM WhatsApp quick message media storage is not configured.",
    );
  }
  const body = decodeBase64(input.base64);
  if (body.byteLength > policy.maxBytes) {
    throw new CrmMessagingGatewayError(
      `CRM WhatsApp quick message ${input.kind.toLowerCase()} media exceeds ${policy.maxBytes} bytes.`,
    );
  }
  const sourceFileName = input.fileName?.trim() || policy.fallbackFileName;
  if (input.kind === "AUDIO" && !input.normalizer) {
    throw new CrmMessagingGatewayError(
      "A normalizacao de audio esta indisponivel. Nenhuma mensagem foi salva.",
      502,
      undefined,
      "configuration_error",
    );
  }
  const media =
    input.kind === "AUDIO"
      ? await normalizeCrmAudio({
          body,
          fileName: sourceFileName,
          maxBytes: policy.maxBytes,
          normalizer: input.normalizer!,
          sourceMimeType,
        })
      : {
          body,
          fileName: sourceFileName,
          mimeType: sourceMimeType.split(";")[0]!.trim(),
        };
  const stored = await input.storage.putObject({
    body: media.body,
    contentType: media.mimeType,
    fileName: media.fileName,
    scopeSegments: [
      "crm",
      "whatsapp",
      input.scope.tenantId,
      input.scope.storeId,
      "quick-messages",
      policy.path,
      randomUUID(),
    ],
  });
  return {
    mediaType: media.mimeType,
    mediaUrl: stored.publicUrl,
    storageKey: stored.storageKey,
  } satisfies StoredQuickMessageMedia;
}

function decodeBase64(value: string | undefined) {
  const normalized = value?.includes(",") ? value.split(",").pop() : value;
  if (!normalized?.trim()) {
    throw new CrmMessagingGatewayError(
      "CRM WhatsApp quick message media payload is empty.",
    );
  }
  return new Uint8Array(Buffer.from(normalized, "base64"));
}
