import type {
  CrmCampaign,
  CrmCampaignRecipient,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import type { RecordCrmCampaignDeliveryInput } from "../../../../domains/crm/ports/crmCampaignRepositoryInputs.js";
import { findMemoryCampaign } from "./crmCampaignMemory.js";

const initialDeliveryStatuses = new Set([
  "sent",
  "replied",
  "secondary_scheduled",
  "secondary_sent",
]);

/**
 * Memory equivalent of the campaign delivery transaction. The operation is
 * synchronous over the in-memory arrays, so concurrent callers cannot yield
 * between the recipient transition and the counter repair.
 */
export function recordMemoryCampaignDelivery(
  campaigns: CrmCampaign[],
  recipients: CrmCampaignRecipient[],
  input: RecordCrmCampaignDeliveryInput,
) {
  const campaign = findMemoryCampaign(campaigns, input);
  if (!campaign) return null;
  const recipient = recipients.find(
    (item) =>
      item.campaignId === input.campaignId &&
      item.sequence === input.campaignSequence &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId &&
      (input.campaignRecipientKey === undefined ||
        input.campaignRecipientKey === null ||
        item.cycleId === input.campaignRecipientKey),
  );
  if (!recipient) return null;

  const initialDelivered = hasInitialDelivery(recipient);
  const secondaryDelivered = hasSecondaryDelivery(recipient);
  let changed = false;

  if (input.errorMessage) {
    const secondaryFailure = input.campaignMessageType === "secondary";
    if (
      secondaryFailure
        ? !secondaryDelivered && recipient.status !== "failed"
        : !initialDelivered &&
          !secondaryDelivered &&
          recipient.status !== "failed"
    ) {
      recipient.errorMessage = input.errorMessage;
      recipient.status = "failed";
      changed = true;
    }
  } else if (input.campaignMessageType === "secondary") {
    if (!secondaryDelivered) {
      recipient.secondarySentAt = input.sentAt ?? new Date();
      if (recipient.status !== "replied") recipient.status = "secondary_sent";
      recipient.errorMessage = null;
      changed = true;
    } else if (!recipient.secondarySentAt) {
      recipient.secondarySentAt = input.sentAt ?? new Date();
      changed = true;
    }
  } else {
    if (!initialDelivered && !isSecondaryFailure(recipient)) {
      recipient.status = "sent";
      recipient.errorMessage = null;
      changed = true;
    } else if (
      recipient.status !== "replied" &&
      recipient.status !== "secondary_scheduled" &&
      recipient.status !== "secondary_sent" &&
      recipient.status !== "sent" &&
      !isSecondaryFailure(recipient)
    ) {
      recipient.status = "sent";
      recipient.errorMessage = null;
      changed = true;
    }
    if (!recipient.initialSentAt) {
      recipient.initialSentAt = input.sentAt ?? new Date();
      changed = true;
    }
    if (!recipient.sentMessageId && input.sentMessageId) {
      recipient.sentMessageId = input.sentMessageId;
      changed = true;
    }
  }

  if (changed) recipient.updatedAt = new Date();
  repairDeliveryCount(campaign, recipients, input);
  return campaign;
}

function repairDeliveryCount(
  campaign: CrmCampaign,
  recipients: readonly CrmCampaignRecipient[],
  input: RecordCrmCampaignDeliveryInput,
) {
  const campaignRecipients = recipients.filter(
    (recipient) =>
      recipient.campaignId === campaign.id &&
      recipient.storeId === campaign.storeId &&
      recipient.tenantId === campaign.tenantId,
  );
  if (input.errorMessage) {
    campaign.failedCount = Math.max(
      campaign.failedCount,
      campaignRecipients.filter((recipient) => recipient.status === "failed")
        .length,
    );
  } else if (input.campaignMessageType === "secondary") {
    campaign.secondarySentCount = Math.max(
      campaign.secondarySentCount,
      campaignRecipients.filter(hasSecondaryDelivery).length,
    );
  } else {
    campaign.sentCount = Math.max(
      campaign.sentCount,
      campaignRecipients.filter(hasInitialDelivery).length,
    );
  }
  campaign.replyRate =
    campaign.sentCount > 0 ? campaign.repliedCount / campaign.sentCount : 0;
  campaign.updatedAt = new Date();
}

function hasInitialDelivery(recipient: CrmCampaignRecipient) {
  return (
    Boolean(recipient.initialSentAt) ||
    Boolean(recipient.sentMessageId) ||
    initialDeliveryStatuses.has(recipient.status)
  );
}

function hasSecondaryDelivery(recipient: CrmCampaignRecipient) {
  return (
    Boolean(recipient.secondarySentAt) || recipient.status === "secondary_sent"
  );
}

function isSecondaryFailure(recipient: CrmCampaignRecipient) {
  return (
    recipient.status === "failed" &&
    Boolean(
      recipient.replyReceivedAt ||
      recipient.secondaryScheduledMessageId ||
      recipient.secondarySentAt,
    )
  );
}
