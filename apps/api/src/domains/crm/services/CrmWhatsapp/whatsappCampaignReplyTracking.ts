import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignRecipient,
  CrmWhatsappMessage,
  CrmWhatsappRepository,
  CrmWhatsappSession,
} from "../../ports/crmWhatsappRepository.js";
import {
  getCrmWhatsappRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import { campaignIngestPermission } from "../../whatsapp/whatsappCampaignTypes.js";
import {
  renderCampaignText,
  truncateCampaignPreview,
} from "../../whatsapp/whatsappCampaignSupport.js";
import { updateCampaignCounts } from "../../whatsapp/whatsappCampaignDeliveryMetrics.js";

export async function trackWhatsappCampaignReply(
  context: ServiceContext,
  input: { message: CrmWhatsappMessage; session: CrmWhatsappSession },
  ports: CrmServicePorts,
) {
  if (input.message.direction !== "INBOUND") return;
  assertPermission(context, campaignIngestPermission);
  const repository = getCrmWhatsappRepository(ports);
  const recipient = await findUnrepliedRecipient(repository, input.session);
  if (!recipient) return;
  const campaign = await repository.findCampaignById({
    campaignId: recipient.campaignId,
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
  });
  if (!campaign || campaign.status === "cancelled") return;
  logWhatsappServiceEvent(context, "crm.whatsapp.campaign.reply.started", {
    campaignId: campaign.id,
    messageId: input.message.id,
    sessionId: input.session.id,
  });
  await recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.campaign.reply",
      category: "data_change",
      entityId: campaign.id,
      entityType: "crm_whatsapp_campaign",
      metadata: {
        campaignRecipientId: recipient.id,
        messageId: input.message.id,
        sessionId: input.session.id,
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
  repository: CrmWhatsappRepository,
  session: CrmWhatsappSession,
) {
  const cycleCandidates = await repository.listCampaignRecipients({
    limit: 10,
    sessionId: session.id,
    statuses: ["sent"],
    storeId: session.storeId,
    tenantId: session.tenantId,
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
    connectionId: session.connectionId,
    limit: 2,
    phone: session.buyerPhone,
    statuses: ["sent"],
    storeId: session.storeId,
    tenantId: session.tenantId,
  });
  const unreplied = routeCandidates.filter(
    (recipient) => !recipient.replyReceivedAt,
  );
  return unreplied.length === 1 ? unreplied[0] : null;
}

async function applyCampaignReply(
  repository: CrmWhatsappRepository,
  campaign: CrmWhatsappCampaign,
  recipient: CrmWhatsappCampaignRecipient,
  input: { message: CrmWhatsappMessage; session: CrmWhatsappSession },
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
    input.session,
    recipient.sessionId,
  );
}

async function createSecondarySchedule(
  repository: CrmWhatsappRepository,
  campaign: CrmWhatsappCampaign,
  recipient: CrmWhatsappCampaignRecipient,
  repliedAt: Date,
) {
  const scheduledAt = new Date(
    repliedAt.getTime() + campaign.secondaryDelayMinutes * 60_000,
  );
  return repository.createScheduledMessage({
    campaignId: campaign.id,
    campaignMessageType: "secondary",
    campaignRecipientKey: recipient.sessionId,
    campaignSequence: recipient.sequence,
    connectionId: recipient.connectionId,
    createdByUserId: campaign.createdByUserId,
    metadata: { campaignId: campaign.id, sequence: recipient.sequence },
    phone: recipient.phone,
    scheduledAt,
    sessionId: recipient.sessionId,
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
    text: renderCampaignText(
      campaign.secondaryContent ?? "",
      recipient.variables,
    ),
  });
}

async function applyReplyTagTransition(
  repository: CrmWhatsappRepository,
  campaign: CrmWhatsappCampaign,
  session: CrmWhatsappSession,
  recipientSessionId: string,
) {
  if (campaign.initialTagId) {
    await repository.removeSessionTag({
      sessionId: recipientSessionId,
      storeId: session.storeId,
      tagId: campaign.initialTagId,
      tenantId: session.tenantId,
    });
  }
  if (campaign.replyTagId) {
    await repository.addSessionTag({
      sessionId: recipientSessionId,
      storeId: session.storeId,
      tagId: campaign.replyTagId,
      tenantId: session.tenantId,
    });
  }
}
