import type {
  CrmConversationRepository,
  CrmScheduledMessage,
} from "../ports/crmConversationRepository.js";
import {
  getCrmOutboundIntentRepository,
  type CrmServicePorts,
} from "../services/CrmService/serviceSupport.js";
import {
  markScheduledMessageIndeterminate,
  readScheduledClaimToken,
  resetScheduledMessageForRetry,
} from "./crmScheduledMessageScheduling.js";
import { classifyOutboundIntentRecovery } from "./outboundMessageSupport.js";

export type ScheduledOutboundReceiptState =
  "confirmed" | "missing" | "retryable" | "unknown";

export async function resolveAbandonedSendingDecision(
  scheduled: CrmScheduledMessage,
  scope: { storeId: string; tenantId: string },
  repository: CrmConversationRepository,
  ports: CrmServicePorts,
  receiptState?: ScheduledOutboundReceiptState,
  blockedReason?: string,
  pendingDisposition?: "cancel" | "defer",
) {
  const state =
    receiptState ?? (await readOutboundReceiptState(scheduled, scope, ports));
  if (state === "confirmed") {
    return "confirmed" as const;
  }
  if (state === "unknown") {
    await deferAbandonedSending(scheduled, repository);
    return "deferred" as const;
  }
  if (
    pendingDisposition === "defer" &&
    (state === "missing" || state === "retryable")
  ) {
    const ownerToken = readScheduledClaimToken(scheduled.metadata);
    const requeued = await repository
      .updateScheduledMessage({
        errorMessage: null,
        expectedStatus: "sending",
        expectedUpdatedAt: scheduled.updatedAt,
        ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
        id: scheduled.id,
        metadata: resetScheduledMessageForRetry(scheduled.metadata),
        status: "pending",
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      })
      .catch(() => null);
    return requeued ? ("requeued" as const) : ("deferred" as const);
  }
  const ownerToken = readScheduledClaimToken(scheduled.metadata);
  await repository
    .updateScheduledMessage({
      cancelledAt: new Date(),
      errorMessage:
        blockedReason ??
        "CRM automation is disabled; abandoned delivery was stopped without a confirmed provider receipt.",
      expectedUpdatedAt: scheduled.updatedAt,
      expectedStatus: "sending",
      ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
      id: scheduled.id,
      status: "cancelled",
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    })
    .catch(() => null);
  return "cancelled" as const;
}

export async function hasConfirmedOutboundReceipt(
  scheduled: Pick<CrmScheduledMessage, "id">,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  return (
    (await readOutboundReceiptState(scheduled, scope, ports)) === "confirmed"
  );
}

/**
 * A provider effect can be committed before finalization, audit, or realtime
 * bookkeeping throws. Preserve the schedule for reconciliation whenever the
 * durable intent says confirmed or the intent read itself is unavailable.
 */
export async function deferIfProviderOutcomeUncertain(
  scheduled: CrmScheduledMessage,
  scope: { storeId: string; tenantId: string },
  repository: CrmConversationRepository,
  ports: CrmServicePorts,
  errorMessage: string,
) {
  const state = await readOutboundReceiptState(scheduled, scope, ports);
  if (state === "missing") return false;
  const reconciliationMessage =
    state === "confirmed"
      ? "CRM provider delivery is confirmed; scheduled bookkeeping remains pending."
      : errorMessage;
  const ownerToken = readScheduledClaimToken(scheduled.metadata);
  await repository
    .updateScheduledMessage({
      errorMessage: reconciliationMessage,
      expectedStatus: "sending",
      expectedUpdatedAt: scheduled.updatedAt,
      ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
      id: scheduled.id,
      metadata: markScheduledMessageIndeterminate(
        scheduled,
        new Date(),
        reconciliationMessage,
      ),
      status: "sending",
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    })
    .catch(() => null);
  return true;
}

export async function readOutboundReceiptState(
  scheduled: Pick<CrmScheduledMessage, "id">,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
): Promise<ScheduledOutboundReceiptState> {
  try {
    const intent = await getCrmOutboundIntentRepository(
      ports,
    ).findByIdempotencyKey({
      idempotencyKey: `scheduled:${scheduled.id}`,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    });
    if (!intent) return "missing";
    const recovery = classifyOutboundIntentRecovery(intent);
    if (recovery === "confirmed") return "confirmed";
    // A durable intent exists but does not contain a valid provider receipt;
    // preserve sending for reconciliation instead of risking a duplicate.
    if (recovery === "indeterminate") return "unknown";
    if (recovery === "retryable") return "retryable";
    return "missing";
  } catch {
    // Without durable intent evidence, never start a fresh provider attempt
    // for a schedule whose campaign is paused/cancelled.
    return "unknown";
  }
}

async function deferAbandonedSending(
  scheduled: CrmScheduledMessage,
  repository: CrmConversationRepository,
) {
  const errorMessage =
    "CRM outbound intent could not be read; delivery remains pending reconciliation.";
  const ownerToken = readScheduledClaimToken(scheduled.metadata);
  await repository
    .updateScheduledMessage({
      errorMessage,
      expectedUpdatedAt: scheduled.updatedAt,
      ...(ownerToken ? { expectedClaimToken: ownerToken } : {}),
      id: scheduled.id,
      metadata: markScheduledMessageIndeterminate(
        scheduled,
        new Date(),
        errorMessage,
      ),
      status: "sending",
      storeId: scheduled.storeId,
      tenantId: scheduled.tenantId,
    })
    .catch(() => null);
}
