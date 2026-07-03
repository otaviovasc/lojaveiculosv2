import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
  FindCrmWhatsappMessageByExternalIdInput,
  FindCrmWhatsappMessageByIdInput,
  UpdateCrmWhatsappMessageInput,
  UpdateCrmWhatsappSessionInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";
import { withUnreadCount } from "./crmWhatsappMemoryQueries.js";

export function findMemoryWhatsappMessageByExternalId(
  messages: readonly CrmWhatsappMessage[],
  input: FindCrmWhatsappMessageByExternalIdInput,
) {
  return (
    messages.find(
      (message) =>
        message.connectionId === input.connectionId &&
        message.externalId === input.externalId &&
        message.storeId === input.storeId &&
        message.tenantId === input.tenantId,
    ) ?? null
  );
}

export function findMemoryWhatsappMessageById(
  messages: readonly CrmWhatsappMessage[],
  input: FindCrmWhatsappMessageByIdInput,
) {
  return (
    messages.find(
      (message) =>
        message.id === input.messageId &&
        message.storeId === input.storeId &&
        message.tenantId === input.tenantId,
    ) ?? null
  );
}

export function updateMemoryWhatsappSession(
  sessions: CrmWhatsappSession[],
  messages: readonly CrmWhatsappMessage[],
  input: UpdateCrmWhatsappSessionInput,
) {
  const session = sessions.find(
    (item) =>
      item.id === input.sessionId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!session) return null;
  if (input.assignedUserId !== undefined) {
    session.assignedUserId = input.assignedUserId;
  }
  if (input.firstHandledAt !== undefined) {
    session.firstHandledAt = input.firstHandledAt;
  }
  if (input.freshLeadAt !== undefined) session.freshLeadAt = input.freshLeadAt;
  if (input.humanTakeoverAt !== undefined) {
    session.humanTakeoverAt = input.humanTakeoverAt;
  }
  if (input.lastAssignedAt !== undefined) {
    session.lastAssignedAt = input.lastAssignedAt;
  }
  if (input.lastCustomerReadAt !== undefined) {
    session.lastCustomerReadAt = input.lastCustomerReadAt;
  }
  if (input.lastReadAt !== undefined) session.lastReadAt = input.lastReadAt;
  if (input.leadId !== undefined) session.leadId = input.leadId;
  if (input.metadata) session.metadata = input.metadata;
  if (input.status) session.status = input.status;
  session.updatedAt = new Date();
  return withUnreadCount(session, messages);
}

export function updateMemoryWhatsappMessage(
  messages: CrmWhatsappMessage[],
  input: UpdateCrmWhatsappMessageInput,
) {
  const message = messages.find(
    (item) =>
      item.id === input.messageId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!message) return null;
  if (input.deletedAt !== undefined) message.deletedAt = input.deletedAt;
  if (input.externalId !== undefined) message.externalId = input.externalId;
  if (input.metadata) message.metadata = input.metadata;
  if (input.providerTimestamp !== undefined) {
    message.providerTimestamp = input.providerTimestamp;
  }
  if (input.status) message.status = input.status;
  message.updatedAt = new Date();
  return message;
}
