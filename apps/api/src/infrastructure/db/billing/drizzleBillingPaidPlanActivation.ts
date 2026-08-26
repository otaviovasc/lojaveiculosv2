import { and, eq, sql } from "drizzle-orm";
import {
  billingCustomers,
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { markHireReconciliationFailed } from "./drizzleBillingPaymentHireState.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
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
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`${scope.tenantId}:${scope.storeId}:plan-activation`}, 31))`,
  );
  const [hire] = await db
    .select()
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.id, scope.hireId),
        eq(billingPlanHires.storeId, scope.storeId),
        eq(billingPlanHires.tenantId, scope.tenantId),
      ),
    )
    .limit(1);
  if (!hire) return false;
  if (hire.status === "paid_active") return true;
  if (!paidEvidenceCanActivateHire(hire, input.amountCents)) {
    await markHireReconciliationFailed(db, hire, input, "payment_mismatch");
    return false;
  }

  const observedAt = new Date();
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
  await bindProviderCustomer(
    db,
    scope.subscriptionId,
    scope.tenantId,
    input,
    now,
  );
  await recordBillingProductEvent(db, {
    eventName: "provider_bound",
    hireId: hire.id,
    idempotencyKey: `billing-hire:${hire.id}:payment-bound`,
    providerCheckoutId: input.providerCheckoutId,
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

  const periodEnd = input.dueAt ? addMonth(input.dueAt) : addMonth(now);
  await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: periodEnd,
      currentPeriodStart: activationAt,
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
      ),
    );
  await db
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
    .where(eq(billingPlanHires.id, hire.id));
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
  await recordBillingProductEvent(db, {
    eventName: "contract_activated",
    hireId: hire.id,
    idempotencyKey: `billing-hire:${hire.id}:contract-activated`,
    properties: {
      catalogVersion: hire.catalogVersion,
      planId: hire.planId,
      quotedCents: hire.quotedCents,
    },
    providerCheckoutId: input.providerCheckoutId,
    providerEventId: input.providerEventId,
    providerPaymentId: input.providerPaymentId,
    providerSubscriptionId: input.providerSubscriptionId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
  return true;
}

export function paidEvidenceCanActivateHire(
  hire: Pick<typeof billingPlanHires.$inferSelect, "quotedCents" | "status">,
  amountCents: number,
) {
  return (
    hire.status !== "downgrade_scheduled" && amountCents === hire.quotedCents
  );
}

export function activationIsDue(effectiveAt: Date, observedAt: Date) {
  return effectiveAt <= observedAt;
}

async function bindProviderCustomer(
  db: DrizzleBillingClient,
  subscriptionId: string,
  tenantId: string,
  input: UpsertBillingProviderPaymentInput,
  now: Date,
) {
  if (!input.providerCustomerId) return;
  const [subscription] = await db
    .select({ billingCustomerId: subscriptions.billingCustomerId })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.tenantId, tenantId),
      ),
    )
    .limit(1);
  if (!subscription) return;
  await db
    .update(billingCustomers)
    .set({
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
      updatedAt: now,
    })
    .where(eq(billingCustomers.id, subscription.billingCustomerId));
}

function addMonth(date: Date): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}
