import { randomUUID } from "node:crypto";
import type {
  CreateCrmWhatsappScheduledMessageInput,
  CrmWhatsappScheduledMessage,
  FindDueCrmWhatsappScheduledMessageScopesInput,
  FindDueCrmWhatsappScheduledMessagesInput,
  ListCrmWhatsappScheduledMessagesInput,
  UpdateCrmWhatsappScheduledMessageInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export function createMemoryScheduledMessage(
  messages: CrmWhatsappScheduledMessage[],
  input: CreateCrmWhatsappScheduledMessageInput,
) {
  const now = new Date();
  const message: CrmWhatsappScheduledMessage = {
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
    phone: input.phone,
    scheduledAt: input.scheduledAt,
    sentAt: null,
    sentMessageId: null,
    sessionId: input.sessionId,
    status: "pending",
    storeId: input.storeId,
    tenantId: input.tenantId,
    text: input.text,
    updatedAt: now,
  };
  messages.push(message);
  return message;
}

export function listMemoryScheduledMessages(
  messages: readonly CrmWhatsappScheduledMessage[],
  input: ListCrmWhatsappScheduledMessagesInput,
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
      (message) => !input.sessionId || message.sessionId === input.sessionId,
    )
    .filter((message) => !input.status || message.status === input.status)
    .sort(
      (left, right) => right.scheduledAt.getTime() - left.scheduledAt.getTime(),
    )
    .slice(0, input.limit);
}

export function findDueMemoryScheduledMessages(
  messages: readonly CrmWhatsappScheduledMessage[],
  input: FindDueCrmWhatsappScheduledMessagesInput,
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
  messages: readonly CrmWhatsappScheduledMessage[],
  input: FindDueCrmWhatsappScheduledMessageScopesInput,
) {
  const scopes = new Map<
    string,
    Pick<CrmWhatsappScheduledMessage, "storeId" | "tenantId">
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
  messages: CrmWhatsappScheduledMessage[],
  input: UpdateCrmWhatsappScheduledMessageInput,
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
