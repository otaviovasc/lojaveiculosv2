import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmCampaign,
  CrmCampaignRecipient,
  CrmMessage,
  CrmConversationRepository,
  CrmConversationCycle,
} from "../../ports/crmConversationRepository.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import { campaignIngestPermission } from "../../messaging/crmCampaignTypes.js";
import {
  renderCampaignText,
  truncateCampaignPreview,
} from "../../messaging/crmCampaignSupport.js";
import { findUnrepliedCampaignRecipient } from "../../messaging/crmCampaignReplyCandidates.js";
import { tryCampaignStageTransition } from "../../messaging/crmCampaignStageTransitions.js";

export async function trackCrmCampaignReply(
  context: ServiceContext,
  input: { message: CrmMessage; conversationCycle: CrmConversationCycle },
  ports: CrmServicePorts,
) {
  if (input.message.direction !== "INBOUND") return;
  assertPermission(context, campaignIngestPermission);
  const repository = getCrmConversationRepository(ports);
  const repliedAt = input.message.providerTimestamp ?? input.message.createdAt;
  const recipient = await findUnrepliedCampaignRecipient(
    repository,
    input.conversationCycle,
    repliedAt,
  );
  if (!recipient) return;
  const campaign = await repository.findCampaignById({
    campaignId: recipient.campaignId,
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
  });
  if (!campaign || campaign.status === "cancelled") return;
  logCrmServiceEvent(context, "crm.campaign.reply.started", {
    campaignId: campaign.id,
    messageId: input.message.id,
    cycleId: input.conversationCycle.id,
  });
  await recordCrmServiceMutation(
    context,
    {
      action: "crm.campaign.reply",
      category: "data_change",
      entityId: campaign.id,
      entityType: "crm_campaign",
      metadata: {
        campaignRecipientId: recipient.id,
        messageId: input.message.id,
        cycleId: input.conversationCycle.id,
      },
      permission: campaignIngestPermission,
      storeId: campaign.storeId,
      summary: "Tracked CRM WhatsApp campaign reply",
      tenantId: campaign.tenantId,
    },
    () =>
      applyCampaignReply(
        context,
        repository,
        campaign,
        recipient,
        input,
        ports,
      ),
  );
}

async function applyCampaignReply(
  context: ServiceContext,
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
  recipient: CrmCampaignRecipient,
  input: { message: CrmMessage; conversationCycle: CrmConversationCycle },
  ports: CrmServicePorts,
) {
  const repliedAt = input.message.providerTimestamp ?? input.message.createdAt;
  const preview = truncateCampaignPreview(input.message.content);
  const secondarySchedule = campaign.secondaryContent
    ? buildSecondarySchedule(campaign, recipient, repliedAt)
    : undefined;
  const claimed = await repository.claimCampaignReply({
    campaignId: campaign.id,
    recipientId: recipient.id,
    replyContentPreview: preview,
    replyMessageId: input.message.id,
    replyReceivedAt: repliedAt,
    ...(secondarySchedule ? { secondarySchedule } : {}),
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
  });
  if (!claimed) return;
  await tryCampaignStageTransition(
    context,
    ports,
    claimed,
    recipient,
    claimed.replyStageId,
    "reply",
  );
}

function buildSecondarySchedule(
  campaign: CrmCampaign,
  recipient: CrmCampaignRecipient,
  repliedAt: Date,
) {
  const scheduledAt = new Date(
    repliedAt.getTime() + campaign.secondaryDelayMinutes * 60_000,
  );
  return {
    campaignRecipientKey: recipient.cycleId,
    campaignSequence: recipient.sequence,
    connectionId: recipient.connectionId,
    createdByUserId: campaign.createdByUserId,
    metadata: { campaignId: campaign.id, sequence: recipient.sequence },
    recipientAddress: recipient.recipientAddress,
    scheduledAt,
    cycleId: recipient.cycleId,
    content: renderCampaignText(
      campaign.secondaryContent ?? "",
      recipient.variables,
    ),
  };
}
