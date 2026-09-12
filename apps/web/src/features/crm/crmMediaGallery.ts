import {
  formatMessageTime,
  getSenderLabel,
  type CrmMessageView,
} from "./crmConversationModel";
import {
  readRecord,
  readString,
  sanitizeCrmMessageUrl,
} from "./crmMessageHelpers";
import type { CrmGalleryMediaItem } from "./CrmMediaGalleryViewer";

export function buildCrmGalleryMediaItems(
  messages: CrmMessageView[],
): CrmGalleryMediaItem[] {
  return messages.flatMap((message) => {
    const url = sanitizeCrmMessageUrl(message.mediaUrl);
    if (!url || !isVisualMedia(message.type)) return [];

    const media = readRecord(readRecord(message.metadata).media);
    const rawCaption = readString(media.caption) ?? message.content;
    const caption =
      rawCaption === `[${message.type.toLowerCase()}]` ? undefined : rawCaption;

    return [
      {
        caption,
        sender:
          getSenderLabel(message) ||
          (message.direction === "OUTBOUND" ? "Você" : "Contato"),
        time: formatMessageTime(message),
        type: message.type,
        url,
      },
    ];
  });
}

function isVisualMedia(type: string) {
  return type === "IMAGE" || type === "VIDEO" || type === "STICKER";
}
