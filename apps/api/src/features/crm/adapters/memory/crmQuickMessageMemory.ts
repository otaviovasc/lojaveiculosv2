import { randomUUID } from "node:crypto";
import type {
  CreateCrmQuickMessageInput,
  CrmQuickMessage,
  FindCrmQuickMessageInput,
  ListCrmQuickMessagesInput,
  UpdateCrmQuickMessageInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";

export function createMemoryQuickMessage(
  quickMessages: CrmQuickMessage[],
  input: CreateCrmQuickMessageInput,
) {
  const now = new Date();
  const message: CrmQuickMessage = {
    content: input.content,
    createdAt: now,
    createdByUserId: input.createdByUserId,
    id: randomUUID(),
    isActive: true,
    kind: input.kind,
    mediaType: input.mediaType ?? null,
    mediaUrl: input.mediaUrl ?? null,
    shortcut: input.shortcut,
    sortOrder: input.sortOrder ?? quickMessages.length,
    storageKey: input.storageKey ?? null,
    storeId: input.storeId,
    tenantId: input.tenantId,
    title: input.title,
    updatedAt: now,
  };
  quickMessages.push(message);
  return message;
}

export function deleteMemoryQuickMessage(
  quickMessages: CrmQuickMessage[],
  input: FindCrmQuickMessageInput,
) {
  const index = quickMessages.findIndex((message) =>
    matchesQuickMessage(message, input),
  );
  if (index === -1) return null;
  const [deleted] = quickMessages.splice(index, 1);
  return deleted ?? null;
}

export function findMemoryQuickMessageById(
  quickMessages: readonly CrmQuickMessage[],
  input: FindCrmQuickMessageInput,
) {
  return (
    quickMessages.find((message) => matchesQuickMessage(message, input)) ?? null
  );
}

export function listMemoryQuickMessages(
  quickMessages: readonly CrmQuickMessage[],
  input: ListCrmQuickMessagesInput,
) {
  return quickMessages
    .filter((message) => message.storeId === input.storeId)
    .filter((message) => message.tenantId === input.tenantId)
    .filter((message) => input.includeInactive || message.isActive)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.shortcut.localeCompare(right.shortcut),
    );
}

export function updateMemoryQuickMessage(
  quickMessages: CrmQuickMessage[],
  input: UpdateCrmQuickMessageInput,
) {
  const message = findMemoryQuickMessageById(quickMessages, input);
  if (!message) return null;
  if (input.content !== undefined) message.content = input.content;
  if (input.isActive !== undefined) message.isActive = input.isActive;
  if (input.kind !== undefined) message.kind = input.kind;
  if (input.mediaType !== undefined) message.mediaType = input.mediaType;
  if (input.mediaUrl !== undefined) message.mediaUrl = input.mediaUrl;
  if (input.shortcut !== undefined) message.shortcut = input.shortcut;
  if (input.sortOrder !== undefined) message.sortOrder = input.sortOrder;
  if (input.storageKey !== undefined) message.storageKey = input.storageKey;
  if (input.title !== undefined) message.title = input.title;
  message.updatedAt = new Date();
  return message;
}

function matchesQuickMessage(
  message: CrmQuickMessage,
  input: FindCrmQuickMessageInput,
) {
  return (
    message.id === input.quickMessageId &&
    message.storeId === input.storeId &&
    message.tenantId === input.tenantId
  );
}
