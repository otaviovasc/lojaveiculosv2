import { and, desc, eq, inArray } from "drizzle-orm";
import { crmCampaignRecipients } from "@lojaveiculosv2/db";
import type {
  CreateCrmCampaignRecipientInput,
  ListCrmCampaignRecipientsInput,
  UpdateCrmCampaignRecipientInput,
} from "../../../domains/crm/ports/crmConversationRepository.js";
import {
  findCanonicalCycleIdsByThread,
  findCanonicalThreadIdForCycle,
} from "./drizzleCrmCanonicalWorkflowReferences.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { readRecord } from "./drizzleCrmConversationMappers.js";

export async function createCrmCampaignRecipient(
  db: DrizzleCrmClient,
  input: CreateCrmCampaignRecipientInput,
) {
  const threadId = await findCanonicalThreadIdForCycle(db, {
    connectionId: input.connectionId,
    cycleId: input.cycleId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  const [row] = await db
    .insert(crmCampaignRecipients)
    .values({
      campaignId: input.campaignId,
      connectionId: input.connectionId,
      initialScheduledMessageId: input.initialScheduledMessageId ?? null,
      leadId: input.leadId ?? null,
      recipientAddress: input.recipientAddress,
      sequence: input.sequence,
      status: input.status ?? "pending",
      storeId: input.storeId,
      tenantId: input.tenantId,
      threadId,
      variables: input.variables ?? {},
    })
    .returning();
  if (!row) throw new Error("CRM WhatsApp campaign recipient insert failed.");
  return toCrmCampaignRecipient(row, input.cycleId);
}

export async function listCrmCampaignRecipients(
  db: DrizzleCrmClient,
  input: ListCrmCampaignRecipientsInput,
) {
  const filters = [
    eq(crmCampaignRecipients.storeId, input.storeId),
    eq(crmCampaignRecipients.tenantId, input.tenantId),
  ];
  if (input.campaignId) {
    filters.push(eq(crmCampaignRecipients.campaignId, input.campaignId));
  }
  if (input.campaignSequence !== undefined) {
    filters.push(eq(crmCampaignRecipients.sequence, input.campaignSequence));
  }
  if (input.connectionId) {
    filters.push(eq(crmCampaignRecipients.connectionId, input.connectionId));
  }
  if (input.recipientAddress) {
    filters.push(
      eq(crmCampaignRecipients.recipientAddress, input.recipientAddress),
    );
  }
  if (input.cycleId) {
    filters.push(
      eq(
        crmCampaignRecipients.threadId,
        await findCanonicalThreadIdForCycle(db, {
          cycleId: input.cycleId,
          storeId: input.storeId,
          tenantId: input.tenantId,
        }),
      ),
    );
  }
  if (input.statuses?.length) {
    filters.push(inArray(crmCampaignRecipients.status, input.statuses));
  }
  const rows = await db
    .select()
    .from(crmCampaignRecipients)
    .where(and(...filters))
    .orderBy(desc(crmCampaignRecipients.updatedAt))
    .limit(input.limit);
  return hydrateCampaignRecipients(db, rows);
}

export async function updateCrmCampaignRecipient(
  db: DrizzleCrmClient,
  input: UpdateCrmCampaignRecipientInput,
) {
  const [row] = await db
    .update(crmCampaignRecipients)
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
        eq(crmCampaignRecipients.id, input.recipientId),
        eq(crmCampaignRecipients.storeId, input.storeId),
        eq(crmCampaignRecipients.tenantId, input.tenantId),
        ...(input.expectedStatus
          ? [eq(crmCampaignRecipients.status, input.expectedStatus)]
          : []),
      ),
    )
    .returning();
  if (!row) return null;
  const [recipient] = await hydrateCampaignRecipients(db, [row]);
  return recipient ?? null;
}

function toCrmCampaignRecipient(
  row: typeof crmCampaignRecipients.$inferSelect,
  cycleId: string,
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
    recipientAddress: row.recipientAddress,
    replyContentPreview: row.replyContentPreview,
    replyMessageId: row.replyMessageId,
    replyReceivedAt: row.replyReceivedAt,
    secondaryScheduledMessageId: row.secondaryScheduledMessageId,
    secondarySentAt: row.secondarySentAt,
    sentMessageId: row.sentMessageId,
    sequence: row.sequence,
    cycleId,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
    variables: readRecord(row.variables),
  };
}

async function hydrateCampaignRecipients(
  db: DrizzleCrmClient,
  rows: readonly (typeof crmCampaignRecipients.$inferSelect)[],
) {
  if (rows.length === 0) return [];
  const first = rows[0];
  if (!first) return [];
  const cycleIdByThread = await findCanonicalCycleIdsByThread(db, {
    storeId: first.storeId,
    tenantId: first.tenantId,
    threadIds: rows.map((row) => row.threadId),
  });
  return rows.map((row) => {
    const cycleId = cycleIdByThread.get(row.threadId);
    if (!cycleId) {
      throw new Error("Canonical CRM campaign-recipient cycle was not found.");
    }
    return toCrmCampaignRecipient(row, cycleId);
  });
}
