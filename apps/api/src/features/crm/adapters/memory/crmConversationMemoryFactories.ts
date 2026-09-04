import { randomUUID } from "node:crypto";
import type {
  CrmConversationCycle,
  CrmMessage,
  IngestCrmMessageInput,
  UpsertCrmConversationCycleContextInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { memoryProfilePhotoMetadata } from "./crmConversationMemoryProfilePhoto.js";

export function createMemoryCycle(
  input: IngestCrmMessageInput,
  now: Date,
): CrmConversationCycle {
  return {
    ...createMemoryCycleContext(input, now),
    firstHandledAt: input.firstHandledAt ?? null,
    freshLeadAt: input.freshLeadAt ?? null,
    lastMessageAt: input.providerTimestamp,
    lastMessageContent: input.content,
    leadId: input.leadId ?? null,
  };
}

export function createMemoryCycleContext(
  input: UpsertCrmConversationCycleContextInput,
  now: Date,
): CrmConversationCycle {
  return {
    archivedAt: null,
    assignedUserId: null,
    customerChatId: input.customerChatId ?? null,
    customerDisplayName: input.customerDisplayName ?? null,
    customerPhone: input.customerPhone,
    channel: input.channel,
    externalThreadId: input.externalThreadId ?? null,
    channelMetadata: {},
    connectionId: input.connectionId,
    createdAt: now,
    deletedAt: null,
    externalCycleId: null,
    firstHandledAt: null,
    freshLeadAt: null,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    interventionId: null,
    id: randomUUID(),
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: null,
    lastMessageContent: null,
    lastReadAt: null,
    leadId: null,
    messageCount: 0,
    metadata: memoryProfilePhotoMetadata(input),
    pinnedAt: null,
    profilePhotoUrl: input.profilePhotoUrl ?? null,
    revision: 0,
    tags: [],
    source: null,
    status: "ACTIVE",
    storeId: input.storeId,
    tenantId: input.tenantId,
    threadId: randomUUID(),
    unreadCount: 0,
    updatedAt: now,
  };
}

export function createMemoryMessage(
  input: IngestCrmMessageInput,
  cycleId: string,
  now: Date,
): CrmMessage {
  return {
    channel: input.channel,
    channelMessageId: input.channelMessageId ?? null,
    connectionId: input.connectionId,
    content: input.content,
    createdAt: now,
    deletedAt: null,
    direction: input.direction,
    externalId: input.externalId,
    id: randomUUID(),
    mediaType: input.mediaType ?? null,
    mediaUrl: input.mediaUrl ?? null,
    metadata: input.metadata,
    providerTimestamp: input.providerTimestamp,
    senderOrigin: input.senderOrigin,
    senderType: input.senderType,
    cycleId,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    type: input.type,
    updatedAt: now,
  };
}
