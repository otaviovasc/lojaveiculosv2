import { and, eq, sql } from "drizzle-orm";
import { crmCampaignRecipients, crmCampaigns } from "@lojaveiculosv2/db";
import type { CrmCampaign } from "../../../domains/crm/ports/crmConversationRepository.js";
import type { RecordCrmCampaignDeliveryInput } from "../../../domains/crm/ports/crmCampaignRepositoryInputs.js";
import { findCanonicalThreadIdForCycle } from "./drizzleCrmCanonicalWorkflowReferences.js";
import { toCrmCampaign } from "./drizzleCrmCampaigns.js";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";

const initialDeliveryStatuses = [
  "sent",
  "replied",
  "secondary_scheduled",
  "secondary_sent",
] as const;

/**
 * Applies a campaign provider result and repairs its affected metric in one
 * transaction. The recipient lock is acquired before the campaign lock, the
 * same order used by reply tracking, so a late initial receipt cannot replace
 * `replied` and two workers cannot count one delivery twice.
 */
export function recordCrmCampaignDelivery(
  db: DrizzleCrmClient,
  input: RecordCrmCampaignDeliveryInput,
  disableTransactions = false,
): Promise<CrmCampaign | null> {
  const execute = (client: DrizzleCrmClient) =>
    recordCrmCampaignDeliveryInTransaction(client, input);
  return disableTransactions
    ? execute(db)
    : db.transaction(async (tx) => execute(tx as DrizzleCrmClient));
}

async function recordCrmCampaignDeliveryInTransaction(
  db: DrizzleCrmClient,
  input: RecordCrmCampaignDeliveryInput,
) {
  const recipientFilters = [
    eq(crmCampaignRecipients.campaignId, input.campaignId),
    eq(crmCampaignRecipients.sequence, input.campaignSequence),
    eq(crmCampaignRecipients.storeId, input.storeId),
    eq(crmCampaignRecipients.tenantId, input.tenantId),
  ];
  if (
    input.campaignRecipientKey !== undefined &&
    input.campaignRecipientKey !== null
  ) {
    recipientFilters.push(
      eq(
        crmCampaignRecipients.threadId,
        await findCanonicalThreadIdForCycle(db, {
          cycleId: input.campaignRecipientKey,
          storeId: input.storeId,
          tenantId: input.tenantId,
        }),
      ),
    );
  }
  const [recipient] = await db
    .select()
    .from(crmCampaignRecipients)
    .where(and(...recipientFilters))
    .limit(1)
    .for("update");
  if (!recipient) return null;

  // Keep recipient -> campaign lock ordering. Reply tracking updates the
  // recipient first and then its campaign counter, so this avoids a deadlock
  // while still serializing aggregate repair with other delivery workers.
  const [campaign] = await db
    .select()
    .from(crmCampaigns)
    .where(campaignScope(input))
    .limit(1)
    .for("update");
  if (!campaign) return null;

  const recipientUpdate = deliveryRecipientUpdate(recipient, input);
  if (Object.keys(recipientUpdate).length > 0) {
    await db
      .update(crmCampaignRecipients)
      .set({ ...recipientUpdate, updatedAt: new Date() })
      .where(
        and(
          eq(crmCampaignRecipients.id, recipient.id),
          eq(crmCampaignRecipients.storeId, input.storeId),
          eq(crmCampaignRecipients.tenantId, input.tenantId),
        ),
      );
  }

  const [counts] = await db
    .select({
      failedCount: sql<number>`count(*) filter (where ${crmCampaignRecipients.status} = 'failed')::int`,
      secondarySentCount: sql<number>`count(*) filter (where ${crmCampaignRecipients.secondarySentAt} is not null or ${crmCampaignRecipients.status} = 'secondary_sent')::int`,
      sentCount: sql<number>`count(*) filter (where ${crmCampaignRecipients.initialSentAt} is not null or ${crmCampaignRecipients.sentMessageId} is not null or ${crmCampaignRecipients.status} in ('sent', 'replied', 'secondary_scheduled', 'secondary_sent'))::int`,
    })
    .from(crmCampaignRecipients)
    .where(
      and(
        eq(crmCampaignRecipients.campaignId, input.campaignId),
        eq(crmCampaignRecipients.storeId, input.storeId),
        eq(crmCampaignRecipients.tenantId, input.tenantId),
      ),
    );
  if (!counts) return toCrmCampaign(campaign);

  const countUpdate = input.errorMessage
    ? {
        failedCount: sql`greatest(${crmCampaigns.failedCount}, ${counts.failedCount})`,
      }
    : input.campaignMessageType === "secondary"
      ? {
          secondarySentCount: sql`greatest(${crmCampaigns.secondarySentCount}, ${counts.secondarySentCount})`,
        }
      : {
          sentCount: sql`greatest(${crmCampaigns.sentCount}, ${counts.sentCount})`,
        };
  const [updatedCampaign] = await db
    .update(crmCampaigns)
    .set({
      ...countUpdate,
      updatedAt: new Date(),
    })
    .where(campaignScope(input))
    .returning();
  return updatedCampaign ? toCrmCampaign(updatedCampaign) : null;
}

function deliveryRecipientUpdate(
  recipient: typeof crmCampaignRecipients.$inferSelect,
  input: RecordCrmCampaignDeliveryInput,
) {
  const update: {
    errorMessage?: string | null;
    initialSentAt?: Date | null;
    secondarySentAt?: Date | null;
    sentMessageId?: string | null;
    status?: typeof crmCampaignRecipients.$inferSelect.status;
  } = {};
  const initialDelivered = hasInitialDelivery(recipient);
  const secondaryDelivered = hasSecondaryDelivery(recipient);

  if (input.errorMessage) {
    const secondaryFailure = input.campaignMessageType === "secondary";
    if (
      secondaryFailure
        ? !secondaryDelivered && recipient.status !== "failed"
        : !initialDelivered &&
          !secondaryDelivered &&
          recipient.status !== "failed"
    ) {
      update.errorMessage = input.errorMessage;
      update.status = "failed";
    }
    return update;
  }

  const sentAt = input.sentAt ?? new Date();
  if (input.campaignMessageType === "secondary") {
    if (!secondaryDelivered) {
      update.secondarySentAt = sentAt;
      if (recipient.status !== "replied") update.status = "secondary_sent";
      update.errorMessage = null;
    } else if (!recipient.secondarySentAt) {
      update.secondarySentAt = sentAt;
    }
    return update;
  }

  if (!initialDelivered && !isSecondaryFailure(recipient)) {
    update.status = "sent";
    update.errorMessage = null;
  } else if (
    recipient.status !== "replied" &&
    recipient.status !== "secondary_scheduled" &&
    recipient.status !== "secondary_sent" &&
    recipient.status !== "sent" &&
    !isSecondaryFailure(recipient)
  ) {
    update.status = "sent";
    update.errorMessage = null;
  }
  if (!recipient.initialSentAt) update.initialSentAt = sentAt;
  if (!recipient.sentMessageId && input.sentMessageId) {
    update.sentMessageId = input.sentMessageId;
  }
  return update;
}

function hasInitialDelivery(
  recipient: typeof crmCampaignRecipients.$inferSelect,
) {
  return (
    Boolean(recipient.initialSentAt) ||
    Boolean(recipient.sentMessageId) ||
    initialDeliveryStatuses.includes(recipient.status as never)
  );
}

function hasSecondaryDelivery(
  recipient: typeof crmCampaignRecipients.$inferSelect,
) {
  return (
    Boolean(recipient.secondarySentAt) || recipient.status === "secondary_sent"
  );
}

function isSecondaryFailure(
  recipient: typeof crmCampaignRecipients.$inferSelect,
) {
  return (
    recipient.status === "failed" &&
    Boolean(
      recipient.replyReceivedAt ||
      recipient.secondaryScheduledMessageId ||
      recipient.secondarySentAt,
    )
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
