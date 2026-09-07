import { randomUUID } from "node:crypto";
import type {
  CreateCrmScheduledMessageInput,
  CrmCampaign,
  CrmScheduledMessage,
  FindDueCrmScheduledMessageScopesInput,
  FindDueCrmScheduledMessagesInput,
  ListCrmScheduledMessagesInput,
  UpdateCrmScheduledMessageInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import {
  isCampaignBookkeepingRetryDue,
  isDueScheduledMessage,
  isScheduledMessageRetryDue,
  SCHEDULED_CLAIM_TOKEN_KEY,
} from "../../../../domains/crm/messaging/crmScheduledMessageScheduling.js";
import {
  cloneScheduledMessage,
  hasCampaignBookkeepingPending,
  isProcessableScheduledMessage,
  isProcessableSpecialDate,
} from "./crmScheduledMessageMemoryFilters.js";

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
    metadata: structuredClone(input.metadata ?? {}),
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
  return cloneScheduledMessage(message);
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
    .filter(
      (message) =>
        input.campaignBookkeepingPending === undefined ||
        (hasCampaignBookkeepingPending(message) ===
          input.campaignBookkeepingPending &&
          (input.campaignBookkeepingPending !== true ||
            isCampaignBookkeepingRetryDue(
              message.metadata,
              input.now ?? new Date(),
            ))),
    )
    .sort(
      (left, right) => right.scheduledAt.getTime() - left.scheduledAt.getTime(),
    )
    .slice(0, input.limit)
    .map(cloneScheduledMessage);
}

export function findDueMemoryScheduledMessages(
  messages: readonly CrmScheduledMessage[],
  campaigns: readonly CrmCampaign[] = [],
  input: FindDueCrmScheduledMessagesInput,
) {
  const now = input.now ?? new Date();
  const staleBefore = input.staleBefore ?? new Date(now.getTime() - 120_000);
  return messages
    .filter((message) => message.storeId === input.storeId)
    .filter((message) => message.tenantId === input.tenantId)
    .filter((message) =>
      isDueScheduledMessage(message, input.dueAt, staleBefore, now),
    )
    .filter((message) =>
      isProcessableSpecialDate(message, input.specialDateConfigs),
    )
    .filter(
      (message) =>
        message.status === "sending" ||
        isProcessableScheduledMessage(message, campaigns),
    )
    .sort(
      (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime(),
    )
    .slice(0, input.limit)
    .map(cloneScheduledMessage);
}

export function findDueMemoryScheduledMessageScopes(
  messages: readonly CrmScheduledMessage[],
  campaigns: readonly CrmCampaign[] = [],
  input: FindDueCrmScheduledMessageScopesInput,
) {
  const now = input.now ?? new Date();
  const staleBefore = input.staleBefore ?? new Date(now.getTime() - 120_000);
  const scopes = new Map<
    string,
    Pick<CrmScheduledMessage, "storeId" | "tenantId">
  >();
  const dueMessages = messages
    .filter(
      (message) =>
        (isDueScheduledMessage(message, input.dueAt, staleBefore, now) &&
          (message.status === "sending" ||
            isProcessableScheduledMessage(message, campaigns)) &&
          isProcessableSpecialDate(message, input.specialDateConfigs)) ||
        (hasCampaignBookkeepingPending(message) &&
          isCampaignBookkeepingRetryDue(message.metadata, now)),
    )
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
  if (input.expectedStatuses?.length) {
    if (input.staleBefore) {
      const isPending =
        message.status === "pending" &&
        input.expectedStatuses.includes("pending");
      const isAbandonedSending =
        message.status === "sending" &&
        input.expectedStatuses.includes("sending") &&
        message.updatedAt <= input.staleBefore &&
        isScheduledMessageRetryDue(message, input.now ?? new Date());
      if (!isPending && !isAbandonedSending) return null;
    } else if (!input.expectedStatuses.includes(message.status)) {
      return null;
    }
  }
  if (
    input.dueAt &&
    message.status === "pending" &&
    message.scheduledAt > input.dueAt
  ) {
    return null;
  }
  if (
    input.expectedUpdatedAt &&
    message.updatedAt.getTime() !== input.expectedUpdatedAt.getTime()
  ) {
    return null;
  }
  if (
    input.expectedClaimToken &&
    message.metadata[SCHEDULED_CLAIM_TOKEN_KEY] !== input.expectedClaimToken
  ) {
    return null;
  }
  message.cancelledAt =
    input.cancelledAt !== undefined ? input.cancelledAt : message.cancelledAt;
  message.content =
    input.content !== undefined ? input.content : message.content;
  message.errorMessage =
    input.errorMessage !== undefined
      ? input.errorMessage
      : message.errorMessage;
  if (input.metadata !== undefined) {
    message.metadata = structuredClone(input.metadata);
  }
  message.sentAt = input.sentAt !== undefined ? input.sentAt : message.sentAt;
  message.sentMessageId =
    input.sentMessageId !== undefined
      ? input.sentMessageId
      : message.sentMessageId;
  message.scheduledAt =
    input.scheduledAt !== undefined ? input.scheduledAt : message.scheduledAt;
  message.status = input.status;
  message.updatedAt =
    input.updatedAt ??
    new Date(Math.max(Date.now(), message.updatedAt.getTime() + 1));
  return cloneScheduledMessage(message);
}
