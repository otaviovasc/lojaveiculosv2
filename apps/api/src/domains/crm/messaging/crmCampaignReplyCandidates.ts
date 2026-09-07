import type {
  CrmCampaignRecipient,
  CrmConversationCycle,
  CrmConversationRepository,
} from "../ports/crmConversationRepository.js";

export async function findUnrepliedCampaignRecipient(
  repository: CrmConversationRepository,
  conversationCycle: CrmConversationCycle,
  repliedAt: Date,
) {
  const cycleRecipients = await listReplyEligibleRecipients(
    repository,
    {
      cycleId: conversationCycle.id,
      storeId: conversationCycle.storeId,
      tenantId: conversationCycle.tenantId,
    },
    repliedAt,
  );
  if (cycleRecipients.length === 1) return cycleRecipients[0];
  if (cycleRecipients.length > 1) return null;

  // A reply may start a new cycle for an existing conversation thread. The
  // canonical DB resolves cycles through that thread, while bounded memory
  // and recovery paths may only have the stable route/customer pair.
  const routeRecipients = await listReplyEligibleRecipients(
    repository,
    {
      connectionId: conversationCycle.connectionId,
      recipientAddress: conversationCycle.customerPhone,
      storeId: conversationCycle.storeId,
      tenantId: conversationCycle.tenantId,
    },
    repliedAt,
  );
  return routeRecipients.length === 1 ? routeRecipients[0] : null;
}

async function listReplyEligibleRecipients(
  repository: CrmConversationRepository,
  input: {
    connectionId?: string;
    cycleId?: string;
    recipientAddress?: string;
    storeId: string;
    tenantId: string;
  },
  repliedAt: Date,
) {
  const [sentCandidates, pendingCandidates] = await Promise.all([
    repository.listCampaignRecipients({
      ...input,
      limit: 10,
      statuses: ["sent"],
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    }),
    repository.listCampaignRecipients({
      ...input,
      limit: 10,
      statuses: ["pending"],
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    }),
  ]);
  const sent = (
    await Promise.all(
      sentCandidates
        .filter((recipient) => !recipient.replyReceivedAt)
        .map(async (recipient) =>
          (await hasConfirmedInitialReceipt(repository, recipient, repliedAt))
            ? recipient
            : null,
        ),
    )
  ).filter(
    (recipient): recipient is CrmCampaignRecipient => recipient !== null,
  );
  const pending = (
    await Promise.all(
      pendingCandidates
        .filter((recipient) => !recipient.replyReceivedAt)
        .map(async (recipient) =>
          (await hasConfirmedInitialReceipt(repository, recipient, repliedAt))
            ? recipient
            : null,
        ),
    )
  ).filter(
    (recipient): recipient is CrmCampaignRecipient => recipient !== null,
  );
  return [...sent, ...pending];
}

async function hasConfirmedInitialReceipt(
  repository: CrmConversationRepository,
  recipient: CrmCampaignRecipient,
  repliedAt: Date,
) {
  if (!recipient.initialScheduledMessageId) return false;
  const [scheduled] = await repository.listScheduledMessages({
    campaignId: recipient.campaignId,
    limit: 1,
    scheduledMessageId: recipient.initialScheduledMessageId,
    status: "sent",
    storeId: recipient.storeId,
    tenantId: recipient.tenantId,
  });
  if (!scheduled || scheduled.campaignMessageType !== "initial") return false;
  const sendAt = recipient.initialSentAt ?? scheduled.sentAt;
  if (!sendAt || sendAt > repliedAt) return false;
  return Boolean(
    recipient.status === "sent" ||
    scheduled.sentAt !== null ||
    scheduled.sentMessageId !== null,
  );
}
