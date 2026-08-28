import type { CrmMessageView } from "./crmConversationModel";
import type { CrmMessage } from "./crmConversationTypes";
import {
  applyRealtimeMessageStatus,
  matchesRealtimeMessageStatus,
  type RealtimeMessageStatusUpdate,
} from "./crmMessageStatusUpdates";

type MessageWithRequestIdentity = CrmMessageView & {
  clientRequestId?: string | null;
};

export type CrmMessageReconciliationResult = {
  messages: CrmMessageView[];
  pendingStatusUpdates: RealtimeMessageStatusUpdate[];
};

export function reconcileCrmMessages(
  current: CrmMessageView[],
  incoming: CrmMessage | readonly CrmMessage[],
  pendingStatusUpdates: readonly RealtimeMessageStatusUpdate[] = [],
): CrmMessageReconciliationResult {
  const incomingMessages: readonly CrmMessage[] = isMessageList(incoming)
    ? incoming
    : [incoming];
  let messages = current;

  for (const serverMessage of incomingMessages) {
    messages = reconcileOneMessage(messages, serverMessage);
  }

  const stillPending: RealtimeMessageStatusUpdate[] = [];
  for (const update of pendingStatusUpdates) {
    if (
      !messages.some((message) => matchesRealtimeMessageStatus(message, update))
    ) {
      stillPending.push(update);
      continue;
    }
    const updated = applyRealtimeMessageStatus(messages, update);
    if (updated !== messages) messages = updated;
  }

  return {
    messages: sortMessagesChronologically(messages),
    pendingStatusUpdates: stillPending,
  };
}

function isMessageList(
  value: CrmMessage | readonly CrmMessage[],
): value is readonly CrmMessage[] {
  return Array.isArray(value);
}

export function readCrmMessageRequestId(message: CrmMessageView) {
  const direct = (message as MessageWithRequestIdentity).clientRequestId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (!message.clientId) return null;
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object") {
    return message.clientId;
  }
  for (const key of ["clientRequestId", "idempotencyKey"] as const) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return message.clientId;
}

function reconcileOneMessage(
  current: CrmMessageView[],
  incoming: CrmMessage,
): CrmMessageView[] {
  const incomingAliases = messageAliases(incoming);
  const matchedIndexes: number[] = [];
  for (const [index, message] of current.entries()) {
    if (sharesIdentity(messageAliases(message), incomingAliases)) {
      matchedIndexes.push(index);
    }
  }

  if (!matchedIndexes.length) return [...current, incoming];

  const firstIndex = matchedIndexes[0] ?? current.length;
  const matched = matchedIndexes.map((index) => current[index]!);
  const merged = matched.reduce<CrmMessageView>(
    (result, message) => mergeMessageValues(message, result),
    incoming,
  );
  const matchedIndexSet = new Set(matchedIndexes);
  const next = current.filter((_message, index) => !matchedIndexSet.has(index));
  next.splice(firstIndex, 0, merged);
  return next;
}

function mergeMessageValues(
  local: CrmMessageView,
  server: CrmMessageView,
): CrmMessageView {
  const mergedStatus = applyRealtimeMessageStatus(
    [{ ...local, ...server, id: server.id, status: local.status }],
    { messageId: server.id, status: server.status },
  )[0]!.status;
  const metadata = { ...(local.metadata ?? {}), ...(server.metadata ?? {}) };
  if (server.status !== "PENDING") delete metadata.localUpload;
  return {
    ...local,
    ...server,
    ...(local.clientId ? { clientId: local.clientId } : {}),
    metadata,
    status: mergedStatus,
  };
}

function messageAliases(message: CrmMessageView) {
  const aliases = new Set<string>();
  addAlias(aliases, "id", message.id);
  addAlias(aliases, "external", message.externalId);
  addAlias(aliases, "request", readCrmMessageRequestId(message));
  return aliases;
}

function addAlias(
  aliases: Set<string>,
  kind: "external" | "id" | "request",
  value: unknown,
) {
  if (typeof value !== "string" && typeof value !== "number") return;
  const normalized = String(value).trim();
  if (normalized) aliases.add(`${kind}:${normalized}`);
}

function sharesIdentity(left: Set<string>, right: Set<string>) {
  for (const alias of left) {
    if (right.has(alias)) return true;
  }
  return false;
}

function sortMessagesChronologically(messages: CrmMessageView[]) {
  return messages
    .map((message, index) => ({ index, message }))
    .sort((left, right) => {
      const difference = messageTime(left.message) - messageTime(right.message);
      return difference || left.index - right.index;
    })
    .map(({ message }) => message);
}

function messageTime(message: CrmMessageView) {
  const value = Date.parse(message.providerTimestamp ?? message.createdAt);
  return Number.isFinite(value) ? value : 0;
}
