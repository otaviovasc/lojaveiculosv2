import type {
  CrmWhatsappCampaign,
  CrmWhatsappRepository,
  CrmWhatsappScheduledMessage,
} from "../ports/crmWhatsappRepository.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";

export async function findProcessableCampaignForSchedule(
  scheduled: CrmWhatsappScheduledMessage,
  ports: CrmServicePorts,
) {
  if (!scheduled.campaignId) return null;
  const campaign = await getCrmWhatsappRepository(ports).findCampaignById({
    campaignId: scheduled.campaignId,
    storeId: scheduled.storeId,
    tenantId: scheduled.tenantId,
  });
  if (!campaign || campaign.status === "cancelled") return { blocked: true };
  if (campaign.status === "paused") return { blocked: true };
  return { blocked: false, campaign };
}

export async function recordCampaignScheduledSendResult(
  scheduled: CrmWhatsappScheduledMessage,
  input: {
    errorMessage?: string;
    sentAt?: Date;
    sentMessageId?: string;
  },
  ports: CrmServicePorts,
) {
  if (!scheduled.campaignId || scheduled.campaignSequence === null) return;
  const repository = getCrmWhatsappRepository(ports);
  const campaign = await repository.findCampaignById({
    campaignId: scheduled.campaignId,
    storeId: scheduled.storeId,
    tenantId: scheduled.tenantId,
  });
  if (!campaign) return;
  const [recipient] = await repository.listCampaignRecipients({
    campaignId: scheduled.campaignId,
    campaignSequence: scheduled.campaignSequence,
    limit: 1,
    storeId: scheduled.storeId,
    tenantId: scheduled.tenantId,
  });
  if (!recipient) return;
  if (input.errorMessage) {
    await repository.updateCampaignRecipient({
      errorMessage: input.errorMessage,
      recipientId: recipient.id,
      status: "failed",
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    });
    await updateCampaignCounts(repository, campaign, { failedDelta: 1 });
    return;
  }
  if (scheduled.campaignMessageType === "secondary") {
    await repository.updateCampaignRecipient({
      recipientId: recipient.id,
      secondarySentAt: input.sentAt ?? new Date(),
      status: "secondary_sent",
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    });
    await updateCampaignCounts(repository, campaign, { secondarySentDelta: 1 });
    return;
  }
  await repository.updateCampaignRecipient({
    initialSentAt: input.sentAt ?? new Date(),
    recipientId: recipient.id,
    sentMessageId: input.sentMessageId ?? null,
    status: "sent",
    storeId: scheduled.storeId,
    tenantId: scheduled.tenantId,
  });
  await updateCampaignCounts(repository, campaign, { sentDelta: 1 });
}

export async function updateCampaignCounts(
  repository: CrmWhatsappRepository,
  campaign: CrmWhatsappCampaign,
  input: {
    failedDelta?: number;
    repliedDelta?: number;
    scheduledDelta?: number;
    secondarySentDelta?: number;
    sentDelta?: number;
  },
) {
  await repository.updateCampaign({
    campaignId: campaign.id,
    failedCount: campaign.failedCount + (input.failedDelta ?? 0),
    repliedCount: campaign.repliedCount + (input.repliedDelta ?? 0),
    scheduledCount: campaign.scheduledCount + (input.scheduledDelta ?? 0),
    secondarySentCount:
      campaign.secondarySentCount + (input.secondarySentDelta ?? 0),
    sentCount: campaign.sentCount + (input.sentDelta ?? 0),
    storeId: campaign.storeId,
    tenantId: campaign.tenantId,
  });
}
