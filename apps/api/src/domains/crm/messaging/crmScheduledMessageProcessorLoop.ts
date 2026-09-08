import type { ServiceContext } from "../../../shared/serviceContext.js";
import { randomUUID } from "node:crypto";
import { reconcilePendingCampaignBookkeeping } from "./crmCampaignDeliveryMetrics.js";
import {
  findScheduledMessageReadiness,
  listEnabledSpecialDateConfigSnapshots,
} from "./crmScheduledMessageReadiness.js";
import {
  clearScheduledMessageDeliveryState,
  CRM_SCHEDULED_MESSAGE_LEASE_MS,
  SCHEDULED_CLAIM_TOKEN_KEY,
} from "./crmScheduledMessageScheduling.js";
import {
  getCrmConversationRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import {
  readOutboundReceiptState,
  resolveAbandonedSendingDecision,
  type ScheduledOutboundReceiptState,
} from "./crmScheduledMessageProcessorRecovery.js";
import { deliverClaimedScheduledMessage } from "./crmScheduledMessageProcessorDelivery.js";

export async function processDueMessages(
  context: ServiceContext,
  input: {
    dueAt: Date;
    limit: number;
    scope: { storeId: string; tenantId: string };
  },
  ports: CrmServicePorts,
) {
  const repository = getCrmConversationRepository(ports);
  await reconcilePendingCampaignBookkeeping(context, input.scope, ports);
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CRM_SCHEDULED_MESSAGE_LEASE_MS);
  const specialDateConfigs = await listEnabledSpecialDateConfigSnapshots(
    input.scope,
    ports,
  );
  const dueMessages = await repository.findDueScheduledMessages({
    dueAt: input.dueAt,
    limit: input.limit,
    now,
    ...(specialDateConfigs ? { specialDateConfigs } : {}),
    staleBefore,
    storeId: input.scope.storeId as never,
    tenantId: input.scope.tenantId as never,
  });
  let processed = 0;
  let sent = 0;
  let failed = 0;
  for (const scheduled of dueMessages) {
    let replayConfirmed = false;
    let receiptState: ScheduledOutboundReceiptState | undefined;
    if (scheduled.status === "sending") {
      receiptState = await readOutboundReceiptState(
        scheduled,
        input.scope,
        ports,
      );
      if (receiptState === "unknown") {
        await resolveAbandonedSendingDecision(
          scheduled,
          input.scope,
          repository,
          ports,
          receiptState,
        );
        continue;
      }
      replayConfirmed = receiptState === "confirmed";
    }
    let readiness;
    try {
      readiness = await findScheduledMessageReadiness(scheduled, ports);
    } catch {
      continue;
    }
    if (readiness?.blocked) {
      if (scheduled.status === "pending") {
        // Evaluation owns cancellation for disabled configurations. A stale
        // revision stays dormant so the next evaluation can atomically replace
        // it with the current annual schedule.
        continue;
      }
      const decision = await resolveAbandonedSendingDecision(
        scheduled,
        input.scope,
        repository,
        ports,
        replayConfirmed ? receiptState : undefined,
        readiness.reason,
        readiness.pendingDisposition,
      );
      if (decision !== "confirmed") continue;
      replayConfirmed = true;
    }
    const claimToken = randomUUID();
    const claimed = await repository.updateScheduledMessage({
      dueAt: input.dueAt,
      expectedStatuses: ["pending", "sending"],
      expectedUpdatedAt: scheduled.updatedAt,
      id: scheduled.id,
      metadata: {
        ...clearScheduledMessageDeliveryState(scheduled.metadata),
        [SCHEDULED_CLAIM_TOKEN_KEY]: claimToken,
      },
      now,
      staleBefore,
      errorMessage: null,
      status: "sending",
      storeId: input.scope.storeId as never,
      tenantId: input.scope.tenantId as never,
    });
    if (!claimed) continue;
    processed += 1;
    const outcome = await deliverClaimedScheduledMessage({
      claimed,
      context,
      ports,
      replayConfirmed,
      scope: input.scope,
    });
    if (outcome === "sent") sent += 1;
    if (outcome === "failed") failed += 1;
  }
  return { failed, processed, sent };
}
