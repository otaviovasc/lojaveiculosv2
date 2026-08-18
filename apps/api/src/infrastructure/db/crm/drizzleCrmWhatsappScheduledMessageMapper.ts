import type { crmWhatsappScheduledMessages } from "@lojaveiculosv2/db";
import { readRecord } from "./drizzleCrmWhatsappMappers.js";

export function toScheduledMessage(
  row: typeof crmWhatsappScheduledMessages.$inferSelect,
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
    phone: row.phone,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    sentMessageId: row.sentMessageId,
    sessionId: row.cycleId,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    text: row.text,
    updatedAt: row.updatedAt,
  };
}
