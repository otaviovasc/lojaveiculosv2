import type { WhatsappMessageView } from "./crmWhatsappModel";

export type WhatsappMessageDisplayGroup =
  | { kind: "single"; message: WhatsappMessageView }
  | { kind: "media"; messages: WhatsappMessageView[] };

const mediaGroupWindowMs = 60_000;

export function groupMessagesForDisplay(
  messages: WhatsappMessageView[],
): WhatsappMessageDisplayGroup[] {
  const groups: WhatsappMessageDisplayGroup[] = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (last?.kind === "media" && canJoinMediaGroup(last, message)) {
      last.messages.push(message);
      continue;
    }
    if (isGroupableMedia(message)) {
      groups.push({ kind: "media", messages: [message] });
      continue;
    }
    groups.push({ kind: "single", message });
  }
  return groups.flatMap((group) => {
    if (group.kind !== "media" || group.messages.length > 1) return [group];
    const message = group.messages[0];
    return message ? [{ kind: "single", message }] : [];
  });
}

function canJoinMediaGroup(
  group: Extract<WhatsappMessageDisplayGroup, { kind: "media" }>,
  message: WhatsappMessageView,
) {
  const previous = group.messages[group.messages.length - 1];
  if (!previous) return false;
  return (
    isGroupableMedia(message) &&
    previous.direction === message.direction &&
    previous.senderType === message.senderType &&
    Math.abs(messageTimeMs(message) - messageTimeMs(previous)) <=
      mediaGroupWindowMs
  );
}

function isGroupableMedia(message: WhatsappMessageView) {
  return (
    !message.deletedAt &&
    Boolean(message.mediaUrl) &&
    (message.type === "IMAGE" || message.type === "VIDEO")
  );
}

function messageTimeMs(message: WhatsappMessageView) {
  const value = message.providerTimestamp ?? message.createdAt;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
