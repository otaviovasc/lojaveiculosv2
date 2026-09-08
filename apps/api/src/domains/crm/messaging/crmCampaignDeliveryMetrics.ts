import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmCampaign,
  CrmConversationRepository,
  CrmScheduledMessage,
} from "../ports/crmConversationRepository.js";
import { tryCampaignStageTransition } from "./crmCampaignStageTransitions.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import {
  clearCampaignBookkeepingState,
  markCampaignBookkeepingRetry,
  readScheduledClaimToken,
} from "./crmScheduledMessageScheduling.js";

export async function findProcessableCampaignForSchedule(
  scheduled: CrmScheduledMessage,
  ports: CrmServicePorts,
) {
  if (!scheduled.campaignId) return null;
  const campaign = await getCrmConversationRepository(ports).findCampaignById({
    campaignId: scheduled.campaignId,
    storeId: scheduled.storeId,
    tenantId: scheduled.tenantId,
  });
  if (!campaign || campaign.status === "cancelled") return { blocked: true };
  if (campaign.status === "paused") return { blocked: true };
  return { blocked: false, campaign };
}

export async function recordCampaignScheduledSendResult(
  context: ServiceContext,
  scheduled: CrmScheduledMessage,
  input: {
    errorMessage?: string;
    sentAt?: Date;
    sentMessageId?: string;
  },
  ports: CrmServicePorts,
): Promise<CrmCampaign> {
  if (!scheduled.campaignId || scheduled.campaignSequence === null) {
    throw new Error(
      "CRM campaign delivery bookkeeping identity is incomplete; delivery remains pending reconciliation.",
    );
  }
  const repository = getCrmConversationRepository(ports);
  const campaign = await repository.recordCampaignDelivery({
    campaignId: scheduled.campaignId,
    campaignMessageType: scheduled.campaignMessageType,
    campaignRecipientKey: scheduled.campaignRecipientKey,
    campaignSequence: scheduled.campaignSequence,
    ...(input.errorMessage ? { errorMessage: input.errorMessage } : {}),
    ...(input.sentAt ? { sentAt: input.sentAt } : {}),
    ...(input.sentMessageId !== undefined
      ? { sentMessageId: input.sentMessageId }
      : {}),
    storeId: scheduled.storeId,
    tenantId: scheduled.tenantId,
  });
  if (!campaign) {
    throw new Error(
      "CRM campaign delivery bookkeeping target was not found; delivery remains pending reconciliation.",
    );
  }
  if (!input.errorMessage && scheduled.campaignMessageType === "initial") {
    const [recipient] = await repository.listCampaignRecipients({
      campaignId: scheduled.campaignId,
      campaignSequence: scheduled.campaignSequence,
      limit: 1,
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    });
    if (recipient) {
      await tryCampaignStageTransition(
        context,
        ports,
        campaign,
        recipient,
        campaign.initialStageId,
        "initial_send",
      );
    }
  }
  return campaign;
}

export async function reconcilePendingCampaignBookkeeping(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
  options: { limit?: number } = {},
) {
  const repository = getCrmConversationRepository(ports);
  const pendingMessages = await repository.listScheduledMessages({
    campaignBookkeepingPending: true,
    limit: options.limit ?? 50,
    now: new Date(),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  let reconciled = 0;
  for (const message of pendingMessages) {
    if (!message.campaignId) continue;
    const ownerToken = readScheduledClaimToken(message.metadata);
    let campaign: CrmCampaign;
    try {
      campaign = await recordCampaignScheduledSendResult(
        context,
        message,
        {
          ...(message.status === "failed" && message.errorMessage
            ? { errorMessage: message.errorMessage }
            : {}),
          ...(message.sentAt ? { sentAt: message.sentAt } : {}),
          ...(message.sentMessageId
            ? { sentMessageId: message.sentMessageId }
            : {}),
        },
        ports,
      );
    } catch (error) {
      const bookkeepingError =
        error instanceof Error ? error.message : String(error);
      await repository
        .updateScheduledMessage({
          ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
          expectedUpdatedAt: message.updatedAt,
          // Keep the provider outcome on the scheduled row. The retry detail
          // belongs in metadata so a failed delivery is not later relabeled
          // with a bookkeeping transport error.
          errorMessage: message.errorMessage,
          id: message.id,
          metadata: {
            ...markCampaignBookkeepingRetry(
              message.metadata,
              new Date(),
              bookkeepingError,
            ),
          },
          status: message.status,
          storeId: scope.storeId as never,
          tenantId: scope.tenantId as never,
        })
        .catch(() => null);
      continue;
    }
    const updatedMetadata = clearCampaignBookkeepingState(message.metadata);
    const updated = await repository
      .updateScheduledMessage({
        ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
        expectedUpdatedAt: message.updatedAt,
        id: message.id,
        metadata: updatedMetadata,
        status: message.status,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      })
      .catch(() => null);
    if (updated) reconciled += 1;
  }
  return { reconciled };
}

export async function updateCampaignCounts(
  repository: CrmConversationRepository,
  campaign: CrmCampaign,
  input: {
    failedDelta?: number;
    repliedDelta?: number;
    scheduledDelta?: number;
    secondarySentDelta?: number;
    sentDelta?: number;
  },
) {
  await repository.incrementCampaignCounts({
    campaignId: campaign.id,
    ...input,
    storeId: campaign.storeId,
    tenantId: campaign.tenantId,
  });
}
