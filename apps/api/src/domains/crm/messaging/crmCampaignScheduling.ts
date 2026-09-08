import type {
  CrmCampaign,
  CrmConversationCycle,
  CrmConversationRepository,
} from "../ports/crmConversationRepository.js";
import {
  campaignScheduledAt,
  renderCampaignText,
} from "./crmCampaignSupport.js";
import type { NormalizedCrmCampaignInput } from "./crmCampaignTypes.js";

export async function createInitialSchedules(
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
  input: NormalizedCrmCampaignInput,
  conversationCycles: readonly CrmConversationCycle[],
  scope: { storeId: string; tenantId: string },
) {
  for (const [sequence, conversationCycle] of conversationCycles.entries()) {
    const variables = input.recipients[sequence]?.variables ?? {};
    const scheduled = await repository.createScheduledMessage({
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: conversationCycle.id,
      campaignSequence: sequence,
      connectionId: conversationCycle.connectionId,
      createdByUserId: campaign.createdByUserId,
      metadata: {
        campaignId: campaign.id,
        sequence,
        variables,
        ...(input.mediaUrl
          ? {
              mediaUrl: input.mediaUrl,
              ...(input.mediaFileName
                ? { mediaFileName: input.mediaFileName }
                : {}),
              ...(input.mediaStorageKey
                ? { mediaStorageKey: input.mediaStorageKey }
                : {}),
              ...(input.mediaType ? { mediaType: input.mediaType } : {}),
            }
          : {}),
      },
      recipientAddress: conversationCycle.customerPhone,
      scheduledAt: campaignScheduledAt(input, sequence),
      cycleId: conversationCycle.id,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      content: renderCampaignText(input.content, variables),
    });
    await repository.createCampaignRecipient({
      campaignId: campaign.id,
      connectionId: conversationCycle.connectionId,
      initialScheduledMessageId: scheduled.id,
      leadId: conversationCycle.leadId,
      recipientAddress: conversationCycle.customerPhone,
      sequence,
      cycleId: conversationCycle.id,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
      variables,
    });
  }
}
