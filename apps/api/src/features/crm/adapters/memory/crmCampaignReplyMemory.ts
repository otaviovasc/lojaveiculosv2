import type {
  CrmCampaign,
  CrmCampaignRecipient,
  CrmScheduledMessage,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import type { ClaimCrmCampaignReplyInput } from "../../../../domains/crm/ports/crmCampaignRepositoryInputs.js";
import { findMemoryCampaign } from "./crmCampaignMemory.js";
import { createMemoryScheduledMessage } from "./crmScheduledMessageMemory.js";

/**
 * Memory equivalent of the reply claim transaction. The state transition and
 * metric update stay synchronous so Promise.all callers cannot claim twice.
 */
export function claimMemoryCampaignReply(
  campaigns: CrmCampaign[],
  recipients: CrmCampaignRecipient[],
  scheduledMessages: CrmScheduledMessage[],
  input: ClaimCrmCampaignReplyInput,
) {
  const recipient = recipients.find(
    (item) =>
      item.id === input.recipientId &&
      item.campaignId === input.campaignId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!recipient) return null;
  const campaign = findMemoryCampaign(campaigns, input);
  if (!campaign || campaign.status === "cancelled") return null;

  const replayClaim =
    recipient.replyMessageId === input.replyMessageId &&
    (recipient.status === "replied" ||
      recipient.status === "secondary_scheduled") &&
    Boolean(recipient.replyReceivedAt);
  const freshClaim =
    !recipient.replyReceivedAt &&
    isReplyClaimable(recipient, scheduledMessages, input.replyReceivedAt);
  if (!freshClaim && !replayClaim) return null;

  let changed = false;
  if (freshClaim) {
    recipient.errorMessage = null;
    recipient.replyContentPreview = input.replyContentPreview;
    recipient.replyMessageId = input.replyMessageId;
    recipient.replyReceivedAt = input.replyReceivedAt;
    recipient.status = "replied";
    campaign.repliedCount += 1;
    changed = true;
  }
  if (input.secondarySchedule && !recipient.secondaryScheduledMessageId) {
    const scheduled = createMemoryScheduledMessage(scheduledMessages, {
      ...input.secondarySchedule,
      campaignId: input.campaignId,
      campaignMessageType: "secondary",
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
    recipient.secondaryScheduledMessageId = scheduled.id;
    if (recipient.status === "replied")
      recipient.status = "secondary_scheduled";
    campaign.scheduledCount += 1;
    changed = true;
  }
  if (changed) recipient.updatedAt = new Date();
  if (!changed) return null;
  campaign.replyRate =
    campaign.sentCount > 0 ? campaign.repliedCount / campaign.sentCount : 0;
  campaign.updatedAt = new Date();
  return campaign;
}

function isReplyClaimable(
  recipient: CrmCampaignRecipient,
  scheduledMessages: readonly CrmScheduledMessage[],
  replyReceivedAt: Date,
) {
  if (
    (recipient.status !== "sent" && recipient.status !== "pending") ||
    !recipient.initialScheduledMessageId
  ) {
    return false;
  }
  const scheduled = scheduledMessages.find(
    (message) =>
      message.id === recipient.initialScheduledMessageId &&
      message.campaignId === recipient.campaignId &&
      message.campaignMessageType === "initial" &&
      message.status === "sent" &&
      message.storeId === recipient.storeId &&
      message.tenantId === recipient.tenantId,
  );
  if (!scheduled) return false;
  const sendAt = recipient.initialSentAt ?? scheduled.sentAt;
  if (!sendAt || sendAt > replyReceivedAt) return false;
  return Boolean(
    recipient.initialSentAt || scheduled.sentAt || scheduled.sentMessageId,
  );
}
