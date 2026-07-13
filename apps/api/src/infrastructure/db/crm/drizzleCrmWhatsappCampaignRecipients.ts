import { and, desc, eq, inArray } from "drizzle-orm";
import { crmWhatsappCampaignRecipients } from "@lojaveiculosv2/db";
import type {
  CreateCrmWhatsappCampaignRecipientInput,
  ListCrmWhatsappCampaignRecipientsInput,
  UpdateCrmWhatsappCampaignRecipientInput,
} from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { readRecord } from "./drizzleCrmWhatsappMappers.js";

export async function createWhatsappCampaignRecipient(
  db: DrizzleCrmClient,
  input: CreateCrmWhatsappCampaignRecipientInput,
) {
  const [row] = await db
    .insert(crmWhatsappCampaignRecipients)
    .values({
      campaignId: input.campaignId,
      connectionId: input.connectionId,
      initialScheduledMessageId: input.initialScheduledMessageId ?? null,
      leadId: input.leadId ?? null,
      phone: input.phone,
      sequence: input.sequence,
      sessionId: input.sessionId,
      status: input.status ?? "pending",
      storeId: input.storeId,
      tenantId: input.tenantId,
      variables: input.variables ?? {},
    })
    .returning();
  if (!row) throw new Error("CRM WhatsApp campaign recipient insert failed.");
  return toWhatsappCampaignRecipient(row);
}

export async function listWhatsappCampaignRecipients(
  db: DrizzleCrmClient,
  input: ListCrmWhatsappCampaignRecipientsInput,
) {
  const filters = [
    eq(crmWhatsappCampaignRecipients.storeId, input.storeId),
    eq(crmWhatsappCampaignRecipients.tenantId, input.tenantId),
  ];
  if (input.campaignId) {
    filters.push(
      eq(crmWhatsappCampaignRecipients.campaignId, input.campaignId),
    );
  }
  if (input.campaignSequence !== undefined) {
    filters.push(
      eq(crmWhatsappCampaignRecipients.sequence, input.campaignSequence),
    );
  }
  if (input.sessionId) {
    filters.push(eq(crmWhatsappCampaignRecipients.sessionId, input.sessionId));
  }
  if (input.statuses?.length) {
    filters.push(inArray(crmWhatsappCampaignRecipients.status, input.statuses));
  }
  const rows = await db
    .select()
    .from(crmWhatsappCampaignRecipients)
    .where(and(...filters))
    .orderBy(desc(crmWhatsappCampaignRecipients.updatedAt))
    .limit(input.limit);
  return rows.map(toWhatsappCampaignRecipient);
}

export async function updateWhatsappCampaignRecipient(
  db: DrizzleCrmClient,
  input: UpdateCrmWhatsappCampaignRecipientInput,
) {
  const [row] = await db
    .update(crmWhatsappCampaignRecipients)
    .set({
      ...(input.errorMessage !== undefined
        ? { errorMessage: input.errorMessage }
        : {}),
      ...(input.initialScheduledMessageId !== undefined
        ? { initialScheduledMessageId: input.initialScheduledMessageId }
        : {}),
      ...(input.initialSentAt !== undefined
        ? { initialSentAt: input.initialSentAt }
        : {}),
      ...(input.replyContentPreview !== undefined
        ? { replyContentPreview: input.replyContentPreview }
        : {}),
      ...(input.replyMessageId !== undefined
        ? { replyMessageId: input.replyMessageId }
        : {}),
      ...(input.replyReceivedAt !== undefined
        ? { replyReceivedAt: input.replyReceivedAt }
        : {}),
      ...(input.secondaryScheduledMessageId !== undefined
        ? { secondaryScheduledMessageId: input.secondaryScheduledMessageId }
        : {}),
      ...(input.secondarySentAt !== undefined
        ? { secondarySentAt: input.secondarySentAt }
        : {}),
      ...(input.sentMessageId !== undefined
        ? { sentMessageId: input.sentMessageId }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crmWhatsappCampaignRecipients.id, input.recipientId),
        eq(crmWhatsappCampaignRecipients.storeId, input.storeId),
        eq(crmWhatsappCampaignRecipients.tenantId, input.tenantId),
        ...(input.expectedStatus
          ? [eq(crmWhatsappCampaignRecipients.status, input.expectedStatus)]
          : []),
      ),
    )
    .returning();
  return row ? toWhatsappCampaignRecipient(row) : null;
}

function toWhatsappCampaignRecipient(
  row: typeof crmWhatsappCampaignRecipients.$inferSelect,
) {
  return {
    campaignId: row.campaignId,
    connectionId: row.connectionId,
    createdAt: row.createdAt,
    errorMessage: row.errorMessage,
    id: row.id,
    initialScheduledMessageId: row.initialScheduledMessageId,
    initialSentAt: row.initialSentAt,
    leadId: row.leadId,
    phone: row.phone,
    replyContentPreview: row.replyContentPreview,
    replyMessageId: row.replyMessageId,
    replyReceivedAt: row.replyReceivedAt,
    secondaryScheduledMessageId: row.secondaryScheduledMessageId,
    secondarySentAt: row.secondarySentAt,
    sentMessageId: row.sentMessageId,
    sequence: row.sequence,
    sessionId: row.sessionId,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
    variables: readRecord(row.variables),
  };
}
