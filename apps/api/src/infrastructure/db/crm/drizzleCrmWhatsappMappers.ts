import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  crmWhatsappMessages,
  crmWhatsappSessions,
} from "@lojaveiculosv2/db";
import type {
  CrmWhatsappMessage,
  CrmWhatsappSession,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";

export function toWhatsappSession(
  row: typeof crmWhatsappSessions.$inferSelect,
  unreadCount: number,
): CrmWhatsappSession {
  return {
    assignedUserId: row.assignedUserId as UserId | null,
    buyerChatLid: row.buyerChatLid,
    buyerName: row.buyerName,
    buyerPhone: row.buyerPhone,
    channel: row.channel,
    channelExternalId: row.channelExternalId,
    channelMetadata: readRecord(row.channelMetadata),
    connectionId: row.connectionId,
    createdAt: row.createdAt,
    externalSessionId: row.externalSessionId,
    firstHandledAt: row.firstHandledAt,
    freshLeadAt: row.freshLeadAt,
    humanTakeoverAt: row.humanTakeoverAt,
    id: row.id,
    lastAssignedAt: row.lastAssignedAt,
    lastCustomerReadAt: row.lastCustomerReadAt,
    lastMessageAt: row.lastMessageAt,
    lastMessageContent: row.lastMessageContent,
    lastReadAt: row.lastReadAt,
    leadId: row.leadId,
    messageCount: row.messageCount,
    metadata: readRecord(row.metadata),
    profilePhotoUrl: row.profilePhotoUrl,
    sessionTags: [],
    source: row.source,
    status: row.status,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    unreadCount,
    updatedAt: row.updatedAt,
  };
}

export function toWhatsappMessage(
  row: typeof crmWhatsappMessages.$inferSelect,
): CrmWhatsappMessage {
  return {
    channel: row.channel,
    channelMessageId: row.channelMessageId,
    connectionId: row.connectionId,
    content: row.content,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
    direction: row.direction,
    externalId: row.externalId,
    id: row.id,
    mediaType: row.mediaType,
    mediaUrl: row.mediaUrl,
    metadata: readRecord(row.metadata),
    providerTimestamp: row.providerTimestamp,
    senderType: row.senderType,
    sessionId: row.sessionId,
    status: row.status,
    storeId: row.storeId as StoreId,
    tenantId: row.tenantId as TenantId,
    type: row.type,
    updatedAt: row.updatedAt,
  };
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
