import { and, eq, isNull, lte, or } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { validatePaidActivationEvidence } from "./drizzleBillingPaymentHireState.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import { bindPaidPlanProviderCustomer } from "./drizzleBillingPaidPlanIdentity.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import { recordPaidActivationObservability } from "./drizzleBillingPaidActivationAudit.js";
import { repairPaidActiveProviderIdentity } from "./drizzleBillingPaidActiveRepair.js";
import {
  activationIsDue,
  addBillingMonth,
  paidEvidenceCanActivateHire,
} from "./drizzleBillingPaidActivationRules.js";
import {
  hasRealProviderSubscriptionId,
  loadPlanHireForActivation,
  stageActivationPendingProviderIdentity,
} from "./drizzleBillingPaidActivationIdentity.js";
import {
  endActivePlanItems,
  finalizeScheduledPaidPlanActivations,
  schedulePaidPlanActivation,
} from "./drizzleBillingScheduledPaidActivation.js";

export async function activatePaidPlanHire(
  db: DrizzleBillingClient,
  args: {
    input: UpsertBillingProviderPaymentInput;
    paymentId: string;
    scope: {
      hireId: string;
      storeId: string | null;
      subscriptionId: string | null;
      tenantId: string;
    };
  },
): Promise<boolean> {
  const { input, paymentId, scope } = args;
  if (!scope.storeId || !scope.subscriptionId) return false;
  await lockEffectivePlanContract(db, scope.tenantId, scope.storeId);
  const hire = await loadPlanHireForActivation(db, {
    hireId: scope.hireId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
  if (!hire) return false;
  if (hire.status === "paid_active" && input.amountCents !== hire.quotedCents) {
    return false;
  }
  if (!(await validatePaidActivationEvidence(db, hire, input))) return false;

  const observedAt = new Date();
  const lifecycleObservedAt = input.providerEventOccurredAt ?? observedAt;
  if (!hasRealProviderSubscriptionId(input.providerSubscriptionId)) {
    if (hire.status !== "paid_active") {
      await stageActivationPendingProviderIdentity(db, hire, input);
    }
    return false;
  }
  if (hire.status === "paid_active") {
    return repairPaidActiveProviderIdentity(db, {
      hire,
      observation: input,
      observedAt,
      paymentId,
    });
  }
  if (
    hire.status === "activation_pending" &&
    hire.effectiveSubscriptionItemId &&
    hire.effectiveAt &&
    hire.effectiveAt <= observedAt
  ) {
    await finalizeScheduledPaidPlanActivations(db, observedAt, hire.id);
    return true;
  }
  const now = input.paidAt ?? observedAt;
  const customerBound = await bindPaidPlanProviderCustomer(
    db,
    scope.subscriptionId,
    scope.storeId,
    scope.tenantId,
    input,
    now,
  );
  if (!customerBound) return false;
  await recordBillingProductEvent(db, {
    eventName: "provider_bound",
    hireId: hire.id,
    idempotencyKey: `billing-hire:${hire.id}:payment-bound`,
    providerCheckoutId: input.providerCheckoutId ?? null,
    providerEventId: input.providerEventId,
    providerPaymentId: input.providerPaymentId,
    providerSubscriptionId: input.providerSubscriptionId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
  const activationAt = hire.effectiveAt ?? now;
  if (!activationIsDue(activationAt, observedAt)) {
    await schedulePaidPlanActivation(db, {
      activationAt,
      hire,
      input,
      observedAt,
      paymentId,
    });
    return true;
  }
  await endActivePlanItems(db, scope.storeId, scope.tenantId, activationAt);
  const [contract] = await db
    .insert(subscriptionItems)
    .values({
      itemType: "plan",
      planId: hire.planId,
      quantity: 1,
      startsAt: activationAt,
      storeId: scope.storeId,
      subscriptionId: scope.subscriptionId,
      tenantId: scope.tenantId,
      unitAmountCents: hire.quotedCents,
    })
    .returning({ id: subscriptionItems.id });
  if (!contract) throw new Error("Paid billing contract was not persisted.");

  const periodEnd = input.dueAt
    ? addBillingMonth(input.dueAt)
    : addBillingMonth(now);
  const [updatedSubscription] = await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: activationAt,
      providerLifecycleEventId: input.providerEventId,
      providerLifecycleObservedAt: lifecycleObservedAt,
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
      provider: input.provider,
      status: "active",
      updatedAt: observedAt,
    })
    .where(
      and(
        eq(subscriptions.id, scope.subscriptionId),
        eq(subscriptions.tenantId, scope.tenantId),
        eq(subscriptions.storeId, scope.storeId),
        ...(input.providerSubscriptionId
          ? [
              or(
                isNull(subscriptions.providerSubscriptionId),
                eq(
                  subscriptions.providerSubscriptionId,
                  input.providerSubscriptionId,
                ),
              ),
            ]
          : []),
        or(
          isNull(subscriptions.providerLifecycleObservedAt),
          lte(subscriptions.providerLifecycleObservedAt, lifecycleObservedAt),
        ),
      ),
    )
    .returning({ id: subscriptions.id });
  if (!updatedSubscription) {
    throw new Error("Paid billing subscription changed during activation.");
  }
  const [updatedHire] = await db
    .update(billingPlanHires)
    .set({
      activatedAt: observedAt,
      completedAt: observedAt,
      effectiveSubscriptionItemId: contract.id,
      failureCode: null,
      providerPaymentId: input.providerPaymentId,
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
      status: "paid_active",
      updatedAt: observedAt,
    })
    .where(
      and(
        eq(billingPlanHires.id, hire.id),
        eq(billingPlanHires.storeId, hire.storeId),
        eq(billingPlanHires.tenantId, hire.tenantId),
        eq(billingPlanHires.status, hire.status),
        or(
          isNull(billingPlanHires.providerPaymentId),
          eq(billingPlanHires.providerPaymentId, input.providerPaymentId),
        ),
        ...(input.providerSubscriptionId
          ? [
              or(
                isNull(billingPlanHires.providerSubscriptionId),
                eq(
                  billingPlanHires.providerSubscriptionId,
                  input.providerSubscriptionId,
                ),
              ),
            ]
          : []),
      ),
    )
    .returning({ id: billingPlanHires.id });
  if (!updatedHire) {
    throw new Error("Billing plan hire changed during activation.");
  }
  await db.insert(billingPlanHireTransitions).values({
    fromStatus: hire.status,
    hireId: hire.id,
    metadata: { paymentId },
    providerEventId: input.providerEventId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
    toStatus: "paid_active",
  });
  await projectSelectedEntitlements(db, {
    source: "billing_plan_hire",
    storeId: scope.storeId,
    subscriptionId: scope.subscriptionId,
    tenantId: scope.tenantId,
  });
  await recordPaidActivationObservability(db, {
    hire,
    observation: input,
    occurredAt: observedAt,
    paymentId,
  });
  return true;
}

export {
  activationIsDue,
  paidEvidenceCanActivateHire,
} from "./drizzleBillingPaidActivationRules.js";
