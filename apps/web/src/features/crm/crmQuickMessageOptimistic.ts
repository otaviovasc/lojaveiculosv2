import {
  createOptimisticMediaMessage,
  createOptimisticTextMessage,
} from "./crmConversationModel";
import type { CrmQuickMessage } from "./crmConversationTypes";

export function createOptimisticQuickMessage(message: CrmQuickMessage) {
  if (message.kind === "TEXT") {
    return createOptimisticTextMessage(message.content);
  }
  return createOptimisticMediaMessage({
    ...(message.kind === "IMAGE" && message.content
      ? { caption: message.content }
      : {}),
    fileName: message.title,
    localUrl: message.mediaUrl ?? "",
    mediaType: message.kind === "AUDIO" ? "audio" : "image",
    ...(message.mediaType ? { mimeType: message.mediaType } : {}),
  });
}
