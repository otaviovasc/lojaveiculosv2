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
import { updateCampaignCounts } from "../../messaging/crmCampaignDeliveryMetrics.js";

export async function trackCrmCampaignReply(
  context: ServiceContext,
  input: { message: CrmMessage; conversationCycle: CrmConversationCycle },
  ports: CrmServicePorts,
) {
  if (input.message.direction !== "INBOUND") return;
  assertPermission(context, campaignIngestPermission);
  const repository = getCrmConversationRepository(ports);
  const recipient = await findUnrepliedRecipient(
    repository,
    input.conversationCycle,
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
    () => applyCampaignReply(repository, campaign, recipient, input),
  );
}

async function findUnrepliedRecipient(
  repository: CrmConversationRepository,
  conversationCycle: CrmConversationCycle,
) {
  const cycleCandidates = await repository.listCampaignRecipients({
    limit: 10,
    cycleId: conversationCycle.id,
    statuses: ["sent"],
    storeId: conversationCycle.storeId,
    tenantId: conversationCycle.tenantId,
  });
  const cycleRecipients = cycleCandidates.filter(
    (recipient) => !recipient.replyReceivedAt,
  );
  if (cycleRecipients.length === 1) return cycleRecipients[0];
  if (cycleRecipients.length > 1) return null;

  // A reply may start a new cycle for an existing conversation thread. The
  // canonical DB resolves cycles through that thread, but bounded in-memory
  // adapters and recovery paths may only have the stable route/customer pair.
  // Attribute only a unique unreplied recipient so concurrent campaigns for
  // the same customer can never be guessed.
  const routeCandidates = await repository.listCampaignRecipients({
    connectionId: conversationCycle.connectionId,
    limit: 2,
    recipientAddress: conversationCycle.customerPhone,
    statuses: ["sent"],
    storeId: conversationCycle.storeId,
    tenantId: conversationCycle.tenantId,
  });
  const unreplied = routeCandidates.filter(
    (recipient) => !recipient.replyReceivedAt,
  );
  return unreplied.length === 1 ? unreplied[0] : null;
}

async function applyCampaignReply(
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
  recipient: CrmCampaignRecipient,
  input: { message: CrmMessage; conversationCycle: CrmConversationCycle },
) {
  const repliedAt = input.message.providerTimestamp ?? input.message.createdAt;
  const preview = truncateCampaignPreview(input.message.content);
  const claimed = await repository.updateCampaignRecipient({
    expectedStatus: "sent",
    recipientId: recipient.id,
    replyContentPreview: preview,
    replyMessageId: input.message.id,
    replyReceivedAt: repliedAt,
    status: "replied",
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
  });
  if (!claimed) return;
  const secondary = campaign.secondaryContent
    ? await createSecondarySchedule(repository, campaign, recipient, repliedAt)
    : null;
  if (secondary) {
    await repository.updateCampaignRecipient({
      expectedStatus: "replied",
      recipientId: recipient.id,
      secondaryScheduledMessageId: secondary.id,
      status: "secondary_scheduled",
      storeId: recipient.storeId,
      tenantId: recipient.tenantId,
    });
  }
  await updateCampaignCounts(repository, campaign, {
    repliedDelta: 1,
    scheduledDelta: secondary ? 1 : 0,
  });
  await applyReplyTagTransition(
    repository,
    campaign,
    input.conversationCycle,
    recipient.cycleId,
  );
}

async function createSecondarySchedule(
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
  recipient: CrmCampaignRecipient,
  repliedAt: Date,
) {
  const scheduledAt = new Date(
    repliedAt.getTime() + campaign.secondaryDelayMinutes * 60_000,
  );
  return repository.createScheduledMessage({
    campaignId: campaign.id,
    campaignMessageType: "secondary",
    campaignRecipientKey: recipient.cycleId,
    campaignSequence: recipient.sequence,
    connectionId: recipient.connectionId,
    createdByUserId: campaign.createdByUserId,
    metadata: { campaignId: campaign.id, sequence: recipient.sequence },
    recipientAddress: recipient.recipientAddress,
    scheduledAt,
    cycleId: recipient.cycleId,
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
    content: renderCampaignText(
      campaign.secondaryContent ?? "",
      recipient.variables,
    ),
  });
}

async function applyReplyTagTransition(
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
  conversationCycle: CrmConversationCycle,
  recipientSessionId: string,
) {
  if (campaign.initialTagId) {
    await repository.removeConversationCycleTag({
      cycleId: recipientSessionId,
      storeId: conversationCycle.storeId,
      tagId: campaign.initialTagId,
      tenantId: conversationCycle.tenantId,
    });
  }
  if (campaign.replyTagId) {
    await repository.addConversationCycleTag({
      cycleId: recipientSessionId,
      storeId: conversationCycle.storeId,
      tagId: campaign.replyTagId,
      tenantId: conversationCycle.tenantId,
    });
  }
}
