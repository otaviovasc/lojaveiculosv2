import type { crmScheduledMessages } from "@lojaveiculosv2/db";
import { readRecord } from "./drizzleCrmConversationMappers.js";

export function toScheduledMessage(
  row: typeof crmScheduledMessages.$inferSelect,
) {
  return {
    cancelledAt: row.cancelledAt,
    campaignId: row.campaignId,
    campaignMessageType: row.campaignMessageType,
    campaignRecipientKey: row.campaignRecipientKey,
    campaignSequence: row.campaignSequence,
    connectionId: row.connectionId,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId as never,
    errorMessage: row.errorMessage,
    id: row.id,
    metadata: readRecord(row.metadata),
    recipientAddress: row.recipientAddress,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    sentMessageId: row.sentMessageId,
    cycleId: row.cycleId,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    content: row.content,
    updatedAt: row.updatedAt,
  };
}
