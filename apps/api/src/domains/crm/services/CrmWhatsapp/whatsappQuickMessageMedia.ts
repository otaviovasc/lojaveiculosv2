import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import { CrmWhatsappGatewayError } from "../../ports/crmWhatsappGateway.js";
import type { CrmWhatsappQuickMessageKind } from "../../ports/crmWhatsappRepository.js";

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
    context.logger.warn("crm.whatsapp.quick_message.media_cleanup.failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      requestId: context.requestId,
      storageKey,
    });
  });
}

export async function storeQuickMessageMedia(input: {
  base64?: string;
  fileName?: string;
  kind: CrmWhatsappQuickMessageKind;
  mediaType?: string;
  scope: { storeId: string; tenantId: string };
  storage: ObjectStorage | null;
}) {
  if (input.kind === "TEXT") return null;
  const policy = mediaPolicy[input.kind];
  const mediaType = input.mediaType?.split(";")[0]?.trim() ?? "";
  if (!mediaType.startsWith(policy.mimePrefix)) {
    throw new CrmWhatsappGatewayError(
      `CRM WhatsApp quick message ${input.kind.toLowerCase()} media type is invalid.`,
    );
  }
  if (!input.storage) {
    throw new CrmWhatsappGatewayError(
      "CRM WhatsApp quick message media storage is not configured.",
    );
  }
  const body = decodeBase64(input.base64);
  if (body.byteLength > policy.maxBytes) {
    throw new CrmWhatsappGatewayError(
      `CRM WhatsApp quick message ${input.kind.toLowerCase()} media exceeds ${policy.maxBytes} bytes.`,
    );
  }
  const stored = await input.storage.putObject({
    body,
    contentType: mediaType,
    fileName: input.fileName?.trim() || policy.fallbackFileName,
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
    mediaType,
    mediaUrl: stored.publicUrl,
    storageKey: stored.storageKey,
  } satisfies StoredQuickMessageMedia;
}

function decodeBase64(value: string | undefined) {
  const normalized = value?.includes(",") ? value.split(",").pop() : value;
  if (!normalized?.trim()) {
    throw new CrmWhatsappGatewayError(
      "CRM WhatsApp quick message media payload is empty.",
    );
  }
  return new Uint8Array(Buffer.from(normalized, "base64"));
}
