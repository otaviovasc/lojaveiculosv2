import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  CrmConversationRepository,
  CrmScheduledMessage,
} from "../ports/crmConversationRepository.js";
import { recordCampaignScheduledSendResult } from "./crmCampaignDeliveryMetrics.js";
import {
  clearCampaignBookkeepingState,
  markCampaignBookkeepingRetry,
  readScheduledClaimToken,
} from "./crmScheduledMessageScheduling.js";
import type { CrmServicePorts } from "../services/CrmService/serviceSupport.js";

export async function finishCampaignBookkeeping(
  context: ServiceContext,
  scheduled: CrmScheduledMessage,
  input: { errorMessage?: string; sentAt?: Date; sentMessageId?: string },
  repository: CrmConversationRepository,
  ports: CrmServicePorts,
) {
  if (!scheduled.campaignId) return;
  const ownerToken = readScheduledClaimToken(scheduled.metadata);
  try {
    const campaign = await recordCampaignScheduledSendResult(
      context,
      scheduled,
      input,
      ports,
    );
    if (!campaign) {
      const errorMessage =
        "CRM campaign delivery bookkeeping target was not found.";
      await repository
        .updateScheduledMessage({
          errorMessage,
          ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
          expectedUpdatedAt: scheduled.updatedAt,
          id: scheduled.id,
          metadata: markCampaignBookkeepingRetry(
            scheduled.metadata,
            new Date(),
            errorMessage,
          ),
          status: scheduled.status,
          storeId: scheduled.storeId,
          tenantId: scheduled.tenantId,
        })
        .catch(() => null);
      return;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await repository
      .updateScheduledMessage({
        errorMessage: scheduled.errorMessage,
        ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
        expectedUpdatedAt: scheduled.updatedAt,
        id: scheduled.id,
        metadata: markCampaignBookkeepingRetry(
          scheduled.metadata,
          new Date(),
          errorMessage,
        ),
        status: scheduled.status,
        storeId: scheduled.storeId,
        tenantId: scheduled.tenantId,
      })
      .catch(() => null);
    return;
  }
  const metadata = clearCampaignBookkeepingState(scheduled.metadata);
  await repository
    .updateScheduledMessage({
      ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
      expectedUpdatedAt: scheduled.updatedAt,
      id: scheduled.id,
      metadata,
      status: scheduled.status,
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    })
    .catch(() => null);
}
