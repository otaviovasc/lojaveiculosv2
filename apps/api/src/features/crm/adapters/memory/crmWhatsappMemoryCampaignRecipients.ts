import { randomUUID } from "node:crypto";
import type {
  CreateCrmWhatsappCampaignRecipientInput,
  CrmWhatsappCampaignRecipient,
  ListCrmWhatsappCampaignRecipientsInput,
  UpdateCrmWhatsappCampaignRecipientInput,
} from "../../../../domains/crm/ports/crmWhatsappRepository.js";

export function createMemoryCampaignRecipient(
  recipients: CrmWhatsappCampaignRecipient[],
  input: CreateCrmWhatsappCampaignRecipientInput,
) {
  const now = new Date();
  const recipient: CrmWhatsappCampaignRecipient = {
    campaignId: input.campaignId,
    connectionId: input.connectionId,
    createdAt: now,
    errorMessage: null,
    id: randomUUID(),
    initialScheduledMessageId: input.initialScheduledMessageId ?? null,
    initialSentAt: null,
    leadId: input.leadId ?? null,
    phone: input.phone,
    replyContentPreview: null,
    replyMessageId: null,
    replyReceivedAt: null,
    secondaryScheduledMessageId: null,
    secondarySentAt: null,
    sentMessageId: null,
    sequence: input.sequence,
    sessionId: input.sessionId,
    status: input.status ?? "pending",
    storeId: input.storeId,
    tenantId: input.tenantId,
    updatedAt: now,
    variables: input.variables ?? {},
  };
  recipients.push(recipient);
  return recipient;
}

export function listMemoryCampaignRecipients(
  recipients: readonly CrmWhatsappCampaignRecipient[],
  input: ListCrmWhatsappCampaignRecipientsInput,
) {
  return recipients
    .filter((recipient) => recipient.storeId === input.storeId)
    .filter((recipient) => recipient.tenantId === input.tenantId)
    .filter(
      (recipient) =>
        !input.campaignId || recipient.campaignId === input.campaignId,
    )
    .filter(
      (recipient) =>
        input.campaignSequence === undefined ||
        recipient.sequence === input.campaignSequence,
    )
    .filter(
      (recipient) =>
        !input.sessionId || recipient.sessionId === input.sessionId,
    )
    .filter(
      (recipient) =>
        !input.statuses?.length || input.statuses.includes(recipient.status),
    )
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, input.limit);
}

export function updateMemoryCampaignRecipient(
  recipients: CrmWhatsappCampaignRecipient[],
  input: UpdateCrmWhatsappCampaignRecipientInput,
) {
  const recipient = recipients.find(
    (item) =>
      item.id === input.recipientId &&
      item.storeId === input.storeId &&
      item.tenantId === input.tenantId,
  );
  if (!recipient) return null;
  if (input.expectedStatus && recipient.status !== input.expectedStatus) {
    return null;
  }
  if (input.errorMessage !== undefined)
    recipient.errorMessage = input.errorMessage;
  if (input.initialScheduledMessageId !== undefined) {
    recipient.initialScheduledMessageId = input.initialScheduledMessageId;
  }
  if (input.initialSentAt !== undefined)
    recipient.initialSentAt = input.initialSentAt;
  if (input.replyContentPreview !== undefined) {
    recipient.replyContentPreview = input.replyContentPreview;
  }
  if (input.replyMessageId !== undefined)
    recipient.replyMessageId = input.replyMessageId;
  if (input.replyReceivedAt !== undefined) {
    recipient.replyReceivedAt = input.replyReceivedAt;
  }
  if (input.secondaryScheduledMessageId !== undefined) {
    recipient.secondaryScheduledMessageId = input.secondaryScheduledMessageId;
  }
  if (input.secondarySentAt !== undefined)
    recipient.secondarySentAt = input.secondarySentAt;
  if (input.sentMessageId !== undefined)
    recipient.sentMessageId = input.sentMessageId;
  if (input.status !== undefined) recipient.status = input.status;
  recipient.updatedAt = new Date();
  return recipient;
}
