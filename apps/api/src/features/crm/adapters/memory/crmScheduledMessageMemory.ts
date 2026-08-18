import { randomUUID } from "node:crypto";
import type {
  CreateCrmScheduledMessageInput,
  CrmScheduledMessage,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  ListCrmScheduledMessagesInput,
  UpdateCrmScheduledMessageInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";

export function createMemoryScheduledMessage(
  messages: CrmScheduledMessage[],
  input: CreateCrmScheduledMessageInput,
) {
  const now = new Date();
  const message: CrmScheduledMessage = {
    cancelledAt: null,
    campaignId: input.campaignId ?? null,
    campaignMessageType: input.campaignMessageType ?? null,
    campaignRecipientKey: input.campaignRecipientKey ?? null,
    campaignSequence: input.campaignSequence ?? null,
    connectionId: input.connectionId,
    createdAt: now,
    createdByUserId: input.createdByUserId ?? null,
    errorMessage: null,
    id: randomUUID(),
    metadata: input.metadata ?? {},
    recipientAddress: input.recipientAddress,
    scheduledAt: input.scheduledAt,
    sentAt: null,
    sentMessageId: null,
    cycleId: input.cycleId,
    status: "pending",
    storeId: input.storeId,
    tenantId: input.tenantId,
    content: input.content,
    updatedAt: now,
  };
  messages.push(message);
  return message;
}

export function listMemoryScheduledMessages(
  messages: readonly CrmScheduledMessage[],
  input: ListCrmScheduledMessagesInput,
) {
  return messages
    .filter((message) => message.storeId === input.storeId)
    .filter((message) => message.tenantId === input.tenantId)
    .filter(
      (message) =>
        !input.connectionId || message.connectionId === input.connectionId,
    )
    .filter(
      (message) => !input.campaignId || message.campaignId === input.campaignId,
    )
    .filter(
      (message) =>
        !input.scheduledMessageId || message.id === input.scheduledMessageId,
    )
    .filter((message) => !input.cycleId || message.cycleId === input.cycleId)
    .filter((message) => !input.status || message.status === input.status)
    .sort(
      (left, right) => right.scheduledAt.getTime() - left.scheduledAt.getTime(),
    )
    .slice(0, input.limit);
}

export function findDueMemoryScheduledMessages(
  messages: readonly CrmScheduledMessage[],
  input: FindDueCrmScheduledMessagesInput,
) {
  return messages
    .filter((message) => message.storeId === input.storeId)
    .filter((message) => message.tenantId === input.tenantId)
    .filter((message) => message.status === "pending")
    .filter((message) => message.scheduledAt <= input.dueAt)
    .sort(
      (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime(),
    )
    .slice(0, input.limit);
}

export function findDueMemoryScheduledMessageScopes(
  messages: readonly CrmScheduledMessage[],
  input: FindDueCrmScheduledMessageScopesInput,
) {
  const scopes = new Map<
    string,
    Pick<CrmScheduledMessage, "storeId" | "tenantId">
  >();
  const dueMessages = messages
    .filter((message) => message.status === "pending")
    .filter((message) => message.scheduledAt <= input.dueAt)
    .sort(
      (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime(),
    );
  for (const message of dueMessages) {
    const key = `${message.tenantId}:${message.storeId}`;
    if (!scopes.has(key)) {
      scopes.set(key, {
        storeId: message.storeId,
        tenantId: message.tenantId,
      });
    }
    if (scopes.size >= input.limit) break;
  }
  return [...scopes.values()];
}

export function updateMemoryScheduledMessage(
  messages: CrmScheduledMessage[],
  input: UpdateCrmScheduledMessageInput,
) {
  const message = messages.find(
    (item) =>
      item.id === input.id &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!message) return null;
  if (input.expectedStatus && message.status !== input.expectedStatus) {
    return null;
  }
  message.cancelledAt =
    input.cancelledAt !== undefined ? input.cancelledAt : message.cancelledAt;
  message.errorMessage =
    input.errorMessage !== undefined
      ? input.errorMessage
      : message.errorMessage;
  message.sentAt = input.sentAt !== undefined ? input.sentAt : message.sentAt;
  message.sentMessageId =
    input.sentMessageId !== undefined
      ? input.sentMessageId
      : message.sentMessageId;
  message.status = input.status;
  message.updatedAt = new Date();
  return message;
}
