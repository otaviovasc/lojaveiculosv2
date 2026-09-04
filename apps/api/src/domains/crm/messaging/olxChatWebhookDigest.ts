import { createHash } from "node:crypto";
import type { ParsedOlxChatWebhook } from "./parseOlxChatWebhook.js";

export function digestOlxChatWebhook(parsed: ParsedOlxChatWebhook) {
  const canonicalPayload = [
    parsed.buyerEmail,
    parsed.customerDisplayName,
    parsed.customerPhone,
    parsed.chatId,
    parsed.externalMessageId,
    parsed.listId,
    parsed.message,
    parsed.origin,
    parsed.senderType,
    parsed.timestamp.toISOString(),
  ];
  return createHash("sha256")
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
}
