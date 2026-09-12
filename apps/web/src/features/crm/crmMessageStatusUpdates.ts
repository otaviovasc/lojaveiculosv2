import type { CrmMessage } from "./crmConversationTypes";
import type { CrmMessageView } from "./crmConversationModel";

export type RealtimeMessageStatusUpdate = {
  lastCustomerReadAt?: string;
  messageId: CrmMessage["id"];
  status: CrmMessage["status"];
};

export function applyRealtimeMessageStatus(
  messages: CrmMessageView[],
  input: RealtimeMessageStatusUpdate,
) {
  let changed = false;
  const next = messages.map((message) => {
    if (!matchesRealtimeMessageStatus(message, input)) return message;
    const status = mergeCrmMessageStatus(message.status, input.status);
    const shouldWriteReadAt = Boolean(
      input.lastCustomerReadAt &&
      message.metadata?.lastCustomerReadAt !== input.lastCustomerReadAt,
    );
    if (status === message.status && !shouldWriteReadAt) return message;
    changed = true;
    return {
      ...message,
      ...(shouldWriteReadAt
        ? {
            metadata: {
              ...(message.metadata ?? {}),
              lastCustomerReadAt: input.lastCustomerReadAt,
            },
          }
        : {}),
      status,
    };
  });
  return changed ? next : messages;
}

export function matchesRealtimeMessageStatus(
  message: CrmMessageView,
  input: RealtimeMessageStatusUpdate,
) {
  const messageId = String(input.messageId);
  return (
    String(message.id) === messageId ||
    (message.externalId != null && String(message.externalId) === messageId)
  );
}

export function bufferRealtimeMessageStatus(
  current: readonly RealtimeMessageStatusUpdate[],
  input: RealtimeMessageStatusUpdate,
  limit: number,
) {
  const existingIndex = current.findIndex(
    (update) => String(update.messageId) === String(input.messageId),
  );
  const next = [...current];
  if (existingIndex < 0) next.push(input);
  else {
    const previous = next[existingIndex]!;
    next[existingIndex] = {
      ...previous,
      ...input,
      status: mergeCrmMessageStatus(previous.status, input.status),
    };
  }
  return next.slice(-Math.max(0, limit));
}

export function mergeCrmMessageStatus(
  current: CrmMessage["status"],
  incoming: CrmMessage["status"],
): CrmMessage["status"] {
  const currentRank = deliveryRank(current);
  const incomingRank = deliveryRank(incoming);
  if (currentRank !== null && incomingRank !== null) {
    return incomingRank > currentRank ? incoming : current;
  }
  if (currentRank !== null) return currentRank === 0 ? incoming : current;
  if (incomingRank !== null) return incomingRank === 0 ? current : incoming;
  if (current === "FAILED" && isUncertain(incoming)) return current;
  if (isUncertain(current) && incomingRank === null) return current;
  return incoming;
}

function isUncertain(status: CrmMessage["status"]) {
  return status === "INDETERMINATE" || status === "PROVIDER_UNKNOWN";
}

function deliveryRank(status: CrmMessage["status"]) {
  switch (status) {
    case "PENDING":
      return 0;
    case "SENT":
      return 1;
    case "DELIVERED":
      return 2;
    case "READ":
      return 3;
    case "FAILED":
    case "INDETERMINATE":
    case "PROVIDER_UNKNOWN":
      return null;
  }
}
