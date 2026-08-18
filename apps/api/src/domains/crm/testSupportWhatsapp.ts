import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConversationCycle } from "./ports/crmConversationRepository.js";

export function createTestCrmConversationCycle(
  overrides: Partial<CrmConversationCycle> = {},
): CrmConversationCycle {
  const now = new Date("2026-08-10T14:00:00.000Z");
  return {
    assignedUserId: null,
    customerChatId: null,
    customerDisplayName: null,
    customerPhone: "5511999999999",
    channel: "WHATSAPP",
    externalThreadId: null,
    channelMetadata: {},
    connectionId: "connection-1",
    createdAt: now,
    externalCycleId: null,
    firstHandledAt: null,
    freshLeadAt: null,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    id: "conversationCycle-1",
    interventionId: null,
    lastAssignedAt: null,
    lastCustomerReadAt: null,
    lastMessageAt: null,
    lastMessageContent: null,
    lastReadAt: null,
    leadId: null,
    messageCount: 0,
    metadata: {},
    profilePhotoUrl: null,
    revision: 0,
    tags: [],
    source: null,
    status: "ACTIVE",
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
    unreadCount: 0,
    updatedAt: now,
    ...overrides,
  };
}
