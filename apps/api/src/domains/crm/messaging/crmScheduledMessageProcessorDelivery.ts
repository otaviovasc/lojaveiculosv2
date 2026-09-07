import type { ServiceContext } from "../../../shared/serviceContext.js";
import { assertCrmScheduledConnectionBinding } from "./assertCrmScheduledConnectionBinding.js";
import { assertSchedulingRoute } from "./assertSchedulingRoute.js";
import { CrmOutboundReconciliationPendingError } from "./crmMessagingErrors.js";
import {
  deferIfProviderOutcomeUncertain,
  resolveAbandonedSendingDecision,
} from "./crmScheduledMessageProcessorRecovery.js";
import { finishCampaignBookkeeping } from "./crmScheduledMessageProcessorSupport.js";
import {
  clearScheduledMessageDeliveryAttempts,
  markScheduledMessageIndeterminate,
  readScheduledClaimToken,
} from "./crmScheduledMessageScheduling.js";
import { sendScheduledMessage } from "./sendScheduledMessage.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import { findScheduledMessageReadiness } from "./crmScheduledMessageReadiness.js";
import type { CrmScheduledMessage } from "../ports/crmConversationRepository.js";

export type ScheduledDeliveryOutcome = "deferred" | "failed" | "sent";

export async function deliverClaimedScheduledMessage(input: {
  claimed: CrmScheduledMessage;
  context: ServiceContext;
  ports: CrmServicePorts;
  replayConfirmed: boolean;
  scope: { storeId: string; tenantId: string };
}): Promise<ScheduledDeliveryOutcome> {
  const repository = getCrmConversationRepository(input.ports);
  let readiness;
  try {
    readiness = await findScheduledMessageReadiness(input.claimed, input.ports);
  } catch {
    const errorMessage =
      "CRM campaign readiness could not be read; delivery remains pending reconciliation.";
    await updateIndeterminate(
      input.claimed,
      input.scope,
      repository,
      errorMessage,
    );
    return "deferred";
  }
  let replayConfirmed = input.replayConfirmed;
  if (readiness?.blocked) {
    const decision = await resolveAbandonedSendingDecision(
      input.claimed,
      input.scope,
      repository,
      input.ports,
      undefined,
      readiness.reason,
      readiness.pendingDisposition,
    );
    if (decision !== "confirmed") return "deferred";
    replayConfirmed = true;
  }

  const ownerToken = readScheduledClaimToken(input.claimed.metadata);
  try {
    if (!replayConfirmed) {
      await assertSchedulingRoute(
        input.claimed.connectionId,
        input.scope,
        input.ports,
      );
    }
    await assertCrmScheduledConnectionBinding(
      input.claimed,
      input.scope,
      repository,
    );
    const message = await sendScheduledMessage(
      input.context,
      input.claimed,
      input.ports,
    );
    const sentAt = new Date();
    const sentMessage = await repository.updateScheduledMessage({
      id: input.claimed.id,
      ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
      expectedUpdatedAt: input.claimed.updatedAt,
      metadata: input.claimed.campaignId
        ? {
            ...clearScheduledMessageDeliveryAttempts(input.claimed.metadata),
            campaignBookkeepingPending: true,
          }
        : clearScheduledMessageDeliveryAttempts(input.claimed.metadata),
      sentAt,
      sentMessageId: String(message.id),
      status: "sent",
      storeId: input.scope.storeId as never,
      tenantId: input.scope.tenantId as never,
    });
    if (!sentMessage) return "deferred";
    await finishCampaignBookkeeping(
      sentMessage,
      { sentAt, sentMessageId: String(message.id) },
      repository,
      input.ports,
    );
    return "sent";
  } catch (error) {
    if (error instanceof CrmOutboundReconciliationPendingError) {
      await updateIndeterminate(
        input.claimed,
        input.scope,
        repository,
        error.message,
      );
      return "deferred";
    }
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (
      await deferIfProviderOutcomeUncertain(
        input.claimed,
        input.scope,
        repository,
        input.ports,
        errorMessage,
      )
    ) {
      return "deferred";
    }
    const failedMessage = await repository.updateScheduledMessage({
      errorMessage,
      ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
      expectedUpdatedAt: input.claimed.updatedAt,
      id: input.claimed.id,
      ...(input.claimed.campaignId
        ? {
            metadata: {
              ...input.claimed.metadata,
              campaignBookkeepingPending: true,
              campaignBookkeepingError: errorMessage,
            },
          }
        : {}),
      status: "failed",
      storeId: input.scope.storeId as never,
      tenantId: input.scope.tenantId as never,
    });
    if (!failedMessage) return "deferred";
    await finishCampaignBookkeeping(
      failedMessage,
      { errorMessage },
      repository,
      input.ports,
    );
    return "failed";
  }
}

async function updateIndeterminate(
  scheduled: CrmScheduledMessage,
  scope: { storeId: string; tenantId: string },
  repository: ReturnType<typeof getCrmConversationRepository>,
  errorMessage: string,
) {
  const ownerToken = readScheduledClaimToken(scheduled.metadata);
  await repository
    .updateScheduledMessage({
      errorMessage,
      ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
      expectedUpdatedAt: scheduled.updatedAt,
      id: scheduled.id,
      metadata: markScheduledMessageIndeterminate(
        scheduled,
        new Date(),
        errorMessage,
      ),
      status: "sending",
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    })
    .catch(() => null);
}
