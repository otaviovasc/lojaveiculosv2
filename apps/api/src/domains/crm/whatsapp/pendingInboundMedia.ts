/**
 * Marks inbound media metadata as pending background mirroring before the
 * webhook is persisted. Z-API requires a media URL up front; Uazapi may
 * resolve the download URL later through the messaging gateway.
 */
export function pendingInboundMediaMetadata(
  message: {
    mediaType?: string | undefined;
    mediaUrl?: string | undefined;
    metadata: Record<string, unknown>;
  },
  options: { requireMediaUrl: boolean },
) {
  if (!message.mediaType || (options.requireMediaUrl && !message.mediaUrl)) {
    return { metadata: message.metadata };
  }
  const current = message.metadata.media;
  return {
    metadata: {
      ...message.metadata,
      media: {
        ...(current && typeof current === "object" && !Array.isArray(current)
          ? current
          : {}),
        mirrorStatus: "pending",
      },
    },
  };
}
