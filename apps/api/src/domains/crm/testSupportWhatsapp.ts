import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmWhatsappSession } from "./ports/crmWhatsappRepository.js";

export function createTestCrmWhatsappSession(
  overrides: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  const now = new Date("2026-08-10T14:00:00.000Z");
  return {
    assignedUserId: null,
    buyerChatLid: null,
    buyerName: null,
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    channelExternalId: null,
    channelMetadata: {},
    connectionId: "connection-1",
    createdAt: now,
    externalSessionId: null,
    firstHandledAt: null,
    freshLeadAt: null,
    humanAttendanceChangedAt: null,
    humanAttendanceState: null,
    humanAttendanceStateVersion: null,
    humanHandlingStartedAt: null,
    humanTakeoverAt: null,
    id: "session-1",
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
    sessionTags: [],
    source: null,
    status: "ACTIVE",
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
    unreadCount: 0,
    updatedAt: now,
    ...overrides,
  };
}
