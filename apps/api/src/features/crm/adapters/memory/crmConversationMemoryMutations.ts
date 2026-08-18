import type {
  CrmMessage,
  CrmConversationCycle,
  FindCrmMessageByExternalIdInput,
  FindCrmMessageByIdInput,
  UpdateCrmMessageInput,
  UpdateCrmConversationCycleInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { withUnreadCount } from "./crmConversationMemoryQueries.js";

export function findMemoryCrmMessageByExternalId(
  messages: readonly CrmMessage[],
  input: FindCrmMessageByExternalIdInput,
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

export function findMemoryCrmMessageById(
  messages: readonly CrmMessage[],
  input: FindCrmMessageByIdInput,
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

export function updateMemoryCrmConversationCycle(
  cycles: CrmConversationCycle[],
  messages: readonly CrmMessage[],
  input: UpdateCrmConversationCycleInput,
) {
  const cycle = cycles.find(
    (item) =>
      item.id === input.cycleId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!cycle) return null;
  if (input.expectedStatus && cycle.status !== input.expectedStatus) {
    return null;
  }
  if (
    input.expectedRevision !== undefined &&
    cycle.revision !== input.expectedRevision
  ) {
    return null;
  }
  if (
    input.expectedHumanAttendanceStateVersion !== undefined &&
    cycle.humanAttendanceStateVersion !==
      input.expectedHumanAttendanceStateVersion
  ) {
    return null;
  }
  if (
    input.expectedInterventionId !== undefined &&
    cycle.interventionId !== input.expectedInterventionId
  ) {
    return null;
  }
  if (input.assignedUserId !== undefined) {
    cycle.assignedUserId = input.assignedUserId;
  }
  if (input.firstHandledAt !== undefined) {
    cycle.firstHandledAt = input.firstHandledAt;
  }
  if (input.freshLeadAt !== undefined) cycle.freshLeadAt = input.freshLeadAt;
  if (input.humanAttendanceChangedAt !== undefined) {
    cycle.humanAttendanceChangedAt = input.humanAttendanceChangedAt;
  }
  if (input.humanAttendanceState !== undefined) {
    cycle.humanAttendanceState = input.humanAttendanceState;
  }
  if (input.humanAttendanceStateVersion !== undefined) {
    cycle.humanAttendanceStateVersion = input.humanAttendanceStateVersion;
  }
  if (input.humanHandlingStartedAt !== undefined) {
    cycle.humanHandlingStartedAt = input.humanHandlingStartedAt;
  }
  if (input.humanTakeoverAt !== undefined) {
    cycle.humanTakeoverAt = input.humanTakeoverAt;
  }
  if (input.interventionId !== undefined) {
    cycle.interventionId = input.interventionId;
  }
  if (input.lastAssignedAt !== undefined) {
    cycle.lastAssignedAt = input.lastAssignedAt;
  }
  if (input.lastCustomerReadAt !== undefined) {
    cycle.lastCustomerReadAt = input.lastCustomerReadAt;
  }
  if (input.lastReadAt !== undefined) cycle.lastReadAt = input.lastReadAt;
  if (input.leadId !== undefined) cycle.leadId = input.leadId;
  if (input.metadata) cycle.metadata = input.metadata;
  if (input.status) cycle.status = input.status;
  cycle.revision += 1;
  cycle.updatedAt = new Date();
  return withUnreadCount(cycle, messages);
}

export function updateMemoryCrmMessage(
  messages: CrmMessage[],
  input: UpdateCrmMessageInput,
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
