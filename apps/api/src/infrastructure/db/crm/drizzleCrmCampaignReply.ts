import { and, eq, sql } from "drizzle-orm";
import {
  crmCampaignRecipients,
  crmCampaigns,
  crmScheduledMessages,
} from "@lojaveiculosv2/db";
import type { CrmCampaign } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { ClaimCrmCampaignReplyInput } from "../../../domains/crm/ports/crmCampaignRepositoryInputs.js";
import { findCanonicalThreadIdForCycle } from "./drizzleCrmCanonicalWorkflowReferences.js";
import { toCrmCampaign } from "./drizzleCrmCampaigns.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

/**
 * Claims a reply, any secondary schedule, and their campaign counters in one
 * transaction. A pending recipient is accepted only after its initial
 * scheduled row has a committed `sent` status.
 */
export function claimCrmCampaignReply(
  db: DrizzleCrmClient,
  input: ClaimCrmCampaignReplyInput,
  disableTransactions = false,
): Promise<CrmCampaign | null> {
  const execute = (client: DrizzleCrmClient) =>
    claimCrmCampaignReplyInTransaction(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

async function claimCrmCampaignReplyInTransaction(
  db: DrizzleCrmClient,
  input: ClaimCrmCampaignReplyInput,
) {
  // Delivery bookkeeping takes the same recipient -> campaign lock order.
  const [recipient] = await db
    .select()
    .from(crmCampaignRecipients)
    .where(
      and(
        eq(crmCampaignRecipients.id, input.recipientId),
        eq(crmCampaignRecipients.campaignId, input.campaignId),
        eq(crmCampaignRecipients.storeId, input.storeId),
        eq(crmCampaignRecipients.tenantId, input.tenantId),
      ),
    )
    .limit(1)
    .for("update");
  if (!recipient) return null;

  const [campaign] = await db
    .select()
    .from(crmCampaigns)
    .where(campaignScope(input))
    .limit(1)
    .for("update");
  if (!campaign || campaign.status === "cancelled") return null;

  const replayClaim =
    recipient.replyMessageId === input.replyMessageId &&
    (recipient.status === "replied" ||
      recipient.status === "secondary_scheduled") &&
    Boolean(recipient.replyReceivedAt);
  const freshClaim =
    !recipient.replyReceivedAt &&
    (recipient.status === "sent" || recipient.status === "pending") &&
    (await hasConfirmedInitialReceipt(db, recipient, input));
  if (!freshClaim && !replayClaim) return null;

  let secondaryCreated = false;
  if (input.secondarySchedule && !recipient.secondaryScheduledMessageId) {
    const threadId = await findCanonicalThreadIdForCycle(db, {
      connectionId: input.secondarySchedule.connectionId,
      cycleId: input.secondarySchedule.cycleId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    const [scheduled] = await db
      .insert(crmScheduledMessages)
      .values({
        campaignId: input.campaignId,
        campaignMessageType: "secondary",
        campaignRecipientKey: input.secondarySchedule.campaignRecipientKey,
        campaignSequence: input.secondarySchedule.campaignSequence,
        connectionId: input.secondarySchedule.connectionId,
        cycleId: input.secondarySchedule.cycleId,
        createdByUserId: input.secondarySchedule.createdByUserId ?? null,
        metadata: input.secondarySchedule.metadata ?? {},
        recipientAddress: input.secondarySchedule.recipientAddress,
        scheduledAt: input.secondarySchedule.scheduledAt,
        storeId: input.storeId,
        tenantId: input.tenantId,
        content: input.secondarySchedule.content,
        threadId,
      })
      .returning({ id: crmScheduledMessages.id });
    if (!scheduled) {
      throw new Error("CRM campaign secondary schedule insert failed.");
    }
    secondaryCreated = true;
    const [updatedRecipient] = await db
      .update(crmCampaignRecipients)
      .set({
        secondaryScheduledMessageId: scheduled.id,
        status: "secondary_scheduled",
        updatedAt: new Date(),
      })
      .where(recipientScope(input, recipient.id))
      .returning({ id: crmCampaignRecipients.id });
    if (!updatedRecipient) {
      throw new Error("CRM campaign secondary schedule claim failed.");
    }
  }

  if (freshClaim) {
    const [updatedRecipient] = await db
      .update(crmCampaignRecipients)
      .set({
        errorMessage: null,
        replyContentPreview: input.replyContentPreview,
        replyMessageId: input.replyMessageId,
        replyReceivedAt: input.replyReceivedAt,
        ...(input.secondarySchedule
          ? { status: "secondary_scheduled" as const }
          : { status: "replied" as const }),
        updatedAt: new Date(),
      })
      .where(recipientScope(input, recipient.id))
      .returning({ id: crmCampaignRecipients.id });
    if (!updatedRecipient) {
      throw new Error("CRM campaign reply recipient claim failed.");
    }
  }

  if (freshClaim || secondaryCreated) {
    const [updatedCampaign] = await db
      .update(crmCampaigns)
      .set({
        ...(freshClaim
          ? { repliedCount: sql`${crmCampaigns.repliedCount} + 1` }
          : {}),
        ...(secondaryCreated
          ? { scheduledCount: sql`${crmCampaigns.scheduledCount} + 1` }
          : {}),
        updatedAt: new Date(),
      })
      .where(campaignScope(input))
      .returning();
    if (!updatedCampaign) {
      throw new Error("CRM campaign reply metric update failed.");
    }
    return toCrmCampaign(updatedCampaign);
  }
  return null;
}

async function hasConfirmedInitialReceipt(
  db: DrizzleCrmClient,
  recipient: typeof crmCampaignRecipients.$inferSelect,
  input: ClaimCrmCampaignReplyInput,
) {
  if (!recipient.initialScheduledMessageId) return false;
  const [scheduled] = await db
    .select({
      sentAt: crmScheduledMessages.sentAt,
      sentMessageId: crmScheduledMessages.sentMessageId,
    })
    .from(crmScheduledMessages)
    .where(
      and(
        eq(crmScheduledMessages.id, recipient.initialScheduledMessageId),
        eq(crmScheduledMessages.campaignId, input.campaignId),
        eq(crmScheduledMessages.campaignMessageType, "initial"),
        eq(crmScheduledMessages.status, "sent"),
        eq(crmScheduledMessages.storeId, input.storeId),
        eq(crmScheduledMessages.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  if (!scheduled) return false;
  const sendAt = recipient.initialSentAt ?? scheduled.sentAt;
  if (!sendAt || sendAt > input.replyReceivedAt) return false;
  return Boolean(
    recipient.initialSentAt || scheduled.sentAt || scheduled.sentMessageId,
  );
}

function recipientScope(
  input: ClaimCrmCampaignReplyInput,
  recipientId: string,
) {
  return and(
    eq(crmCampaignRecipients.id, recipientId),
    eq(crmCampaignRecipients.storeId, input.storeId),
    eq(crmCampaignRecipients.tenantId, input.tenantId),
  );
}

function campaignScope(input: {
  campaignId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(crmCampaigns.id, input.campaignId),
    eq(crmCampaigns.storeId, input.storeId),
    eq(crmCampaigns.tenantId, input.tenantId),
  );
}
