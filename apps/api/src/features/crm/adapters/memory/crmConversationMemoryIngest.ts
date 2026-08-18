import { randomUUID } from "node:crypto";
import type {
  CrmMessage,
  CrmConversationCycle,
  IngestCrmMessageInput,
  UpsertCrmConversationCycleContextInput,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { shouldBackfillCrmMessagingPhone } from "../../../../domains/crm/messaging/contactIdentity.js";
import { withUnreadCount } from "./crmConversationMemoryQueries.js";
import {
  requireHydratedCycle,
  type MemoryCrmTagState,
} from "./crmTagMemory.js";
import { updateMemoryCyclePreview } from "./crmConversationCycleMemoryPreview.js";
import { memoryProfilePhotoMetadata } from "./crmConversationMemoryProfilePhoto.js";
import { reconciledOutboundEchoSender } from "../../../../domains/crm/whatsapp/reconcileWhatsappOutboundEcho.js";

type CrmConversationCycleIdentityInput =
  IngestCrmMessageInput | UpsertCrmConversationCycleContextInput;
export function findMemoryCycle(
  cycles: readonly CrmConversationCycle[],
  input: CrmConversationCycleIdentityInput,
) {
  const scoped = cycles.filter(
    (cycle) =>
      cycle.channel === input.channel &&
      cycle.connectionId === input.connectionId &&
      cycle.storeId === input.storeId &&
      cycle.tenantId === input.tenantId,
  );
  return (
    scoped.find(
      (cycle) =>
        Boolean(input.externalThreadId) &&
        cycle.externalThreadId === input.externalThreadId,
    ) ??
    scoped.find(
      (cycle) =>
        Boolean(input.customerPhone) &&
        cycle.customerPhone === input.customerPhone,
    ) ??
    scoped.find(
      (cycle) =>
        Boolean(input.customerChatId) &&
        cycle.customerChatId === input.customerChatId,
    )
  );
}

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
    assignedUserId: null,
    customerChatId: input.customerChatId ?? null,
    customerDisplayName: input.customerDisplayName ?? null,
    customerPhone: input.customerPhone,
    channel: input.channel,
    externalThreadId: input.externalThreadId ?? null,
    channelMetadata: {},
    connectionId: input.connectionId,
    createdAt: now,
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
    profilePhotoUrl: input.profilePhotoUrl ?? null,
    revision: 0,
    tags: [],
    source: null,
    status: "ACTIVE",
    storeId: input.storeId,
    tenantId: input.tenantId,
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

export function upsertMemoryCycleContext(
  cycles: CrmConversationCycle[],
  input: UpsertCrmConversationCycleContextInput,
) {
  let cycle = findMemoryCycle(cycles, input);
  if (!cycle) {
    cycle = createMemoryCycleContext(input, new Date());
    cycles.push(cycle);
  } else {
    const matchedByChatLid = Boolean(
      input.customerChatId && cycle.customerChatId === input.customerChatId,
    );
    let changed = false;
    if (
      shouldBackfillCrmMessagingPhone(
        cycle.customerPhone,
        input.customerPhone,
        matchedByChatLid,
      )
    ) {
      cycle.customerPhone = input.customerPhone;
      changed = true;
    }
    if (input.profilePhotoStorageKey) {
      cycle.metadata = {
        ...cycle.metadata,
        ...memoryProfilePhotoMetadata(input),
      };
      changed = true;
    }
    if (!cycle.customerChatId && input.customerChatId) {
      cycle.customerChatId = input.customerChatId;
      changed = true;
    }
    if (!cycle.customerDisplayName && input.customerDisplayName) {
      cycle.customerDisplayName = input.customerDisplayName;
      changed = true;
    }
    if (!cycle.externalThreadId && input.externalThreadId) {
      cycle.externalThreadId = input.externalThreadId;
      changed = true;
    }
    if (
      input.profilePhotoUrl &&
      cycle.profilePhotoUrl !== input.profilePhotoUrl
    ) {
      cycle.profilePhotoUrl = input.profilePhotoUrl;
      changed = true;
    }
    if (changed) {
      cycle.revision += 1;
      cycle.updatedAt = new Date();
    }
  }
  return cycle;
}

export async function ingestMemoryCrmMessage(input: {
  message: IngestCrmMessageInput;
  messages: CrmMessage[];
  cycles: CrmConversationCycle[];
  tagState: MemoryCrmTagState;
}) {
  const now = new Date();
  let createdConversationCycle = false;
  let cycle = findMemoryCycle(input.cycles, input.message);
  if (!cycle) {
    createdConversationCycle = true;
    cycle = createMemoryCycle(input.message, now);
    input.cycles.push(cycle);
  } else {
    cycle = upsertMemoryCycleContext(input.cycles, input.message);
  }

  const existing = input.messages.find(
    (message) =>
      message.cycleId === cycle.id &&
      message.externalId === input.message.externalId,
  );
  if (existing) {
    const reconciled = reconciledOutboundEchoSender(existing, input.message);
    if (reconciled) {
      existing.senderOrigin = reconciled.senderOrigin;
      existing.senderType = reconciled.senderType;
      existing.updatedAt = now;
    }
    return {
      createdMessage: false,
      createdConversationCycle,
      message: existing,
      conversationCycle: hydrate(cycle, input.messages, input.tagState),
    };
  }

  const message = createMemoryMessage(input.message, cycle.id, now);
  input.messages.push(message);
  updateMemoryCyclePreview(cycle, input.message);
  return {
    createdMessage: true,
    createdConversationCycle,
    message,
    conversationCycle: hydrate(cycle, input.messages, input.tagState),
  };
}

function hydrate(
  cycle: CrmConversationCycle,
  messages: CrmMessage[],
  tagState: MemoryCrmTagState,
) {
  return requireHydratedCycle(withUnreadCount(cycle, messages), tagState);
}
