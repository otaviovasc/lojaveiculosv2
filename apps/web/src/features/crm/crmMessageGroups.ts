import type { CrmMessageView } from "./crmConversationModel";

export type CrmMessageDisplayGroup =
  | { kind: "single"; message: CrmMessageView }
  | { kind: "media"; messages: CrmMessageView[] };

const mediaGroupWindowMs = 60_000;

export function groupMessagesForDisplay(
  messages: CrmMessageView[],
): CrmMessageDisplayGroup[] {
  const groups: CrmMessageDisplayGroup[] = [];
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
  group: Extract<CrmMessageDisplayGroup, { kind: "media" }>,
  message: CrmMessageView,
) {
  const previous = group.messages[group.messages.length - 1];
  if (!previous) return false;
  return (
    group.messages.length < 4 &&
    isGroupableMedia(message) &&
    previous.direction === message.direction &&
    previous.senderType === message.senderType &&
    Math.abs(messageTimeMs(message) - messageTimeMs(previous)) <=
      mediaGroupWindowMs
  );
}

function isGroupableMedia(message: CrmMessageView) {
  const replyTo = readReplyTo(message);
  return (
    !message.deletedAt &&
    !replyTo &&
    Boolean(message.mediaUrl) &&
    (message.type === "IMAGE" || message.type === "VIDEO")
  );
}

function readReplyTo(message: CrmMessageView) {
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return false;
  const replyTo = metadata.replyTo;
  return Boolean(
    replyTo &&
    typeof replyTo === "object" &&
    !Array.isArray(replyTo) &&
    Object.keys(replyTo).length,
  );
}

function messageTimeMs(message: CrmMessageView) {
  const value = message.providerTimestamp ?? message.createdAt;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}
