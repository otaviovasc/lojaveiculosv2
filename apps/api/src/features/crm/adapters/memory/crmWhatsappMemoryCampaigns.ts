import { randomUUID } from "node:crypto";
import type {
  CreateCrmWhatsappCampaignInput,
  CrmWhatsappCampaign,
  ListCrmWhatsappCampaignsInput,
  FindCrmWhatsappCampaignInput,
  IncrementCrmWhatsappCampaignCountsInput,
  UpdateCrmWhatsappCampaignInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export function createMemoryCampaign(
  campaigns: CrmWhatsappCampaign[],
  input: CreateCrmWhatsappCampaignInput,
) {
  const now = new Date();
  const campaign: CrmWhatsappCampaign = {
    content: input.content,
    createdAt: now,
    createdByUserId: input.createdByUserId ?? null,
    failedCount: 0,
    id: randomUUID(),
    initialTagId: input.initialTagId ?? null,
    intervalMinutes: input.intervalMinutes,
    mediaType: input.mediaType ?? null,
    mediaUrl: input.mediaUrl ?? null,
    metadata: input.metadata ?? {},
    name: input.name,
    repliedCount: input.repliedCount ?? 0,
    replyRate: 0,
    replyTagId: input.replyTagId ?? null,
    scheduledCount: input.scheduledCount,
    scheduledEndAt: input.scheduledEndAt,
    scheduledStartAt: input.scheduledStartAt,
    secondaryContent: input.secondaryContent ?? null,
    secondaryDelayMinutes: input.secondaryDelayMinutes ?? 1,
    secondarySentCount: input.secondarySentCount ?? 0,
    selectedConnectionId: input.selectedConnectionId ?? null,
    sentCount: input.sentCount ?? 0,
    status: input.status,
    storeId: input.storeId,
    tenantId: input.tenantId,
    totalRecipients: input.totalRecipients,
    updatedAt: now,
  };
  campaigns.push(campaign);
  return campaign;
}

export function findMemoryCampaign(
  campaigns: readonly CrmWhatsappCampaign[],
  input: FindCrmWhatsappCampaignInput,
) {
  return (
    campaigns.find(
      (campaign) =>
        campaign.id === input.campaignId &&
        campaign.storeId === input.storeId &&
        campaign.tenantId === input.tenantId,
    ) ?? null
  );
}

export function listMemoryCampaigns(
  campaigns: readonly CrmWhatsappCampaign[],
  input: ListCrmWhatsappCampaignsInput,
) {
  return campaigns
    .filter((campaign) => campaign.storeId === input.storeId)
    .filter((campaign) => campaign.tenantId === input.tenantId)
    .filter((campaign) => !input.status || campaign.status === input.status)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, input.limit);
}

export function updateMemoryCampaign(
  campaigns: CrmWhatsappCampaign[],
  input: UpdateCrmWhatsappCampaignInput,
) {
  const campaign = findMemoryCampaign(campaigns, input);
  if (!campaign) return null;
  if (input.failedCount !== undefined) campaign.failedCount = input.failedCount;
  if (input.metadata !== undefined) campaign.metadata = input.metadata;
  if (input.repliedCount !== undefined) {
    campaign.repliedCount = input.repliedCount;
  }
  if (input.scheduledCount !== undefined) {
    campaign.scheduledCount = input.scheduledCount;
  }
  if (input.secondarySentCount !== undefined) {
    campaign.secondarySentCount = input.secondarySentCount;
  }
  if (input.sentCount !== undefined) campaign.sentCount = input.sentCount;
  if (input.status !== undefined) campaign.status = input.status;
  campaign.replyRate =
    campaign.sentCount > 0 ? campaign.repliedCount / campaign.sentCount : 0;
  campaign.updatedAt = new Date();
  return campaign;
}

export function incrementMemoryCampaignCounts(
  campaigns: CrmWhatsappCampaign[],
  input: IncrementCrmWhatsappCampaignCountsInput,
) {
  const campaign = findMemoryCampaign(campaigns, input);
  if (!campaign) return null;
  campaign.failedCount += input.failedDelta ?? 0;
  campaign.repliedCount += input.repliedDelta ?? 0;
  campaign.scheduledCount += input.scheduledDelta ?? 0;
  campaign.secondarySentCount += input.secondarySentDelta ?? 0;
  campaign.sentCount += input.sentDelta ?? 0;
  campaign.replyRate =
    campaign.sentCount > 0 ? campaign.repliedCount / campaign.sentCount : 0;
  campaign.updatedAt = new Date();
  return campaign;
}
