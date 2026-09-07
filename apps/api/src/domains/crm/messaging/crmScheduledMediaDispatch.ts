import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../ports/crmMessagingGateway.js";
import type { PreparedOutboundCrmMessage } from "./outboundMessageTypes.js";
import { CrmMessageActionError } from "./crmMessagingErrors.js";
import type { CrmMessageType } from "../ports/crmConversationRepository.js";

export type ScheduledMessagePayload = {
  content: string;
  id?: string;
  metadata?: Record<string, unknown> | null;
  recipientAddress: string;
};

export type ScheduledMediaMetadata = {
  mediaFileName?: string | null;
  mediaStorageKey?: string | null;
  mediaType: "audio" | "document" | "image" | "video";
  mediaUrl: string;
  mimeType?: string | null;
};

/**
 * Extracts and strictly validates scheduled media metadata.
 * If media was intended (hasMedia flag, media object, or mediaUrl) but is invalid,
 * this function THROWS CrmMessageActionError so the scheduler fails explicitly
 * rather than silently losing the attachment.
 * Never interpolates the raw media URL in error messages as it may contain signed tokens.
 */
export function extractScheduledMediaMetadata(
  metadata: unknown,
): ScheduledMediaMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;

  // Check nested media object if present
  if (record.media !== undefined) {
    if (!record.media || typeof record.media !== "object") {
      throw new CrmMessageActionError(
        "Scheduled message has invalid media metadata object.",
      );
    }
    const extracted = extractScheduledMediaMetadata(record.media);
    if (!extracted) {
      throw new CrmMessageActionError(
        "Scheduled message indicates media attachment but media metadata is empty.",
      );
    }
    return extracted;
  }

  const hasMediaIndicator =
    Boolean(record.hasMedia) ||
    typeof record.mediaUrl === "string" ||
    record.mediaUrl !== undefined ||
    typeof record.mediaType === "string" ||
    record.mediaType !== undefined ||
    typeof record.mediaFileName === "string" ||
    record.mediaFileName !== undefined ||
    typeof record.mediaStorageKey === "string" ||
    record.mediaStorageKey !== undefined ||
    typeof record.storageKey === "string" ||
    record.storageKey !== undefined;

  if (!hasMediaIndicator && !record.mediaUrl) {
    return null;
  }

  if (typeof record.mediaUrl !== "string" || !record.mediaUrl.trim()) {
    throw new CrmMessageActionError(
      "Scheduled message indicates media attachment but mediaUrl is missing or empty.",
    );
  }

  const mediaUrl = record.mediaUrl.trim();
  if (!isHttpUrl(mediaUrl)) {
    throw new CrmMessageActionError(
      "Scheduled message mediaUrl must be a valid HTTP(S) URL.",
    );
  }

  const rawType =
    typeof record.mediaType === "string"
      ? record.mediaType.toLowerCase().trim()
      : "image";

  let mediaType: "audio" | "document" | "image" | "video";
  if (rawType === "image" || rawType.startsWith("image/")) {
    mediaType = "image";
  } else if (rawType === "video" || rawType.startsWith("video/")) {
    mediaType = "video";
  } else if (rawType === "audio" || rawType.startsWith("audio/")) {
    mediaType = "audio";
  } else if (rawType === "document" || rawType.startsWith("application/")) {
    mediaType = "document";
  } else {
    throw new CrmMessageActionError(
      `Scheduled message has unsupported mediaType "${rawType}".`,
    );
  }

  const mimeType =
    typeof record.mimeType === "string" && record.mimeType.includes("/")
      ? record.mimeType.trim()
      : typeof record.mediaType === "string" && record.mediaType.includes("/")
        ? record.mediaType.trim()
        : null;

  const mediaFileName =
    typeof record.mediaFileName === "string" && record.mediaFileName.trim()
      ? record.mediaFileName.trim()
      : null;
  const mediaStorageKey = readStorageKey(record);
  return {
    mediaFileName,
    ...(mediaStorageKey ? { mediaStorageKey } : {}),
    mediaType,
    mediaUrl,
    mimeType,
  };
}

function readStorageKey(record: Record<string, unknown>): string | null {
  const raw = record.mediaStorageKey ?? record.storageKey;
  if (raw === undefined || raw === null) return null;
  if (
    typeof raw !== "string" ||
    !raw.trim() ||
    raw.includes("://") ||
    raw.split("/").some((segment) => segment === "..")
  ) {
    throw new CrmMessageActionError(
      "Scheduled message has an invalid managed media storage reference.",
    );
  }
  return raw.trim();
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * Prepares the outbound payload inside a durable sendOutboundMessage preparation callback.
 * Ensures stable intent, provider-aware address resolution, uppercase CrmMessageType,
 * preserves providerTimestamp, and fails explicitly on malformed media.
 */
export async function prepareScheduledOutboundPayload(
  gateway: CrmMessagingGateway,
  connection: CrmConnection,
  scheduledMessage: ScheduledMessagePayload,
): Promise<PreparedOutboundCrmMessage> {
  const media = extractScheduledMediaMetadata(scheduledMessage.metadata);

  if (media) {
    const caption = scheduledMessage.content.trim();
    if (caption.length > 1000) {
      throw new CrmMessageActionError(
        "Scheduled media caption exceeds 1000 characters.",
      );
    }
    const result = await gateway.sendMedia(connection, {
      ...(caption ? { caption } : {}),
      ...(media.mediaFileName ? { fileName: media.mediaFileName } : {}),
      mediaType: media.mediaType,
      mediaUrl: media.mediaUrl,
      ...(media.mimeType ? { mimeType: media.mimeType } : {}),
      phone: scheduledMessage.recipientAddress,
    });

    const crmType: CrmMessageType =
      media.mediaType === "video"
        ? "VIDEO"
        : media.mediaType === "audio"
          ? "AUDIO"
          : media.mediaType === "document"
            ? "DOCUMENT"
            : "IMAGE";

    return {
      content: scheduledMessage.content,
      leadActivityContent:
        scheduledMessage.content || `[${media.mediaType.toUpperCase()}]`,
      mediaType: media.mediaType,
      mediaUrl: media.mediaUrl,
      metadata: {
        ...(scheduledMessage.metadata ?? {}),
        dispatchedMedia: media,
      },
      sent: {
        externalId: result.externalId,
        providerTimestamp: result.providerTimestamp,
      },
      type: crmType,
    };
  }

  const result = await gateway.sendText(connection, {
    phone: scheduledMessage.recipientAddress,
    text: scheduledMessage.content,
  });

  return {
    content: scheduledMessage.content,
    metadata: scheduledMessage.metadata ?? {},
    sent: {
      externalId: result.externalId,
      providerTimestamp: result.providerTimestamp,
    },
    type: "TEXT",
  };
}
