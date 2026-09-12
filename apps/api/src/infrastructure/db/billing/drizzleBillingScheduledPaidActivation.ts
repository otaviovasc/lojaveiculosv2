import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  payments,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { failScheduledProviderBinding } from "./drizzleBillingScheduledProviderBinding.js";
import { recordPaidActivationAudit } from "./drizzleBillingPaidActivationAudit.js";
import { hasRealProviderSubscriptionId } from "./drizzleBillingPaidActivationIdentity.js";

export { endActivePlanItems } from "./drizzleBillingPlanItemTransitions.js";
export { schedulePaidPlanActivation } from "./drizzleBillingPaidActivationScheduling.js";

export async function finalizeScheduledPaidPlanActivations(
  db: DrizzleBillingClient,
  now: Date = new Date(),
  hireId?: string,
) {
  const due = await db
    .select({
      hire: billingPlanHires,
      item: subscriptionItems,
      paymentId: payments.id,
    })
    .from(billingPlanHires)
    .innerJoin(
      subscriptionItems,
      and(
        eq(subscriptionItems.id, billingPlanHires.effectiveSubscriptionItemId),
        eq(subscriptionItems.subscriptionId, billingPlanHires.subscriptionId),
        eq(subscriptionItems.storeId, billingPlanHires.storeId),
        eq(subscriptionItems.tenantId, billingPlanHires.tenantId),
      ),
    )
    .innerJoin(
      payments,
      and(
        eq(payments.provider, billingPlanHires.provider),
        eq(payments.providerPaymentId, billingPlanHires.providerPaymentId),
        eq(payments.subscriptionId, billingPlanHires.subscriptionId),
        eq(payments.storeId, billingPlanHires.storeId),
        eq(payments.tenantId, billingPlanHires.tenantId),
      ),
    )
    .where(
      and(
        eq(billingPlanHires.status, "activation_pending"),
        eq(payments.status, "paid"),
        eq(payments.amountCents, billingPlanHires.quotedCents),
        eq(subscriptionItems.itemType, "plan"),
        eq(subscriptionItems.unitAmountCents, billingPlanHires.quotedCents),
        lte(subscriptionItems.startsAt, now),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
        lte(billingPlanHires.effectiveAt, now),
        ...(hireId ? [eq(billingPlanHires.id, hireId)] : []),
      ),
    )
    .limit(hireId ? 1 : 1_000);
  let finalized = 0;
  for (const candidate of due) {
    await db.transaction(async (tx) => {
      const client = tx as DrizzleBillingClient;
      await client.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${candidate.hire.tenantId}:${candidate.hire.storeId}:plan-activation`}, 31))`,
      );
      const [hire] = await client
        .select()
        .from(billingPlanHires)
        .where(
          and(
            eq(billingPlanHires.id, candidate.hire.id),
            eq(billingPlanHires.storeId, candidate.hire.storeId),
            eq(billingPlanHires.subscriptionId, candidate.hire.subscriptionId),
            eq(billingPlanHires.tenantId, candidate.hire.tenantId),
            eq(billingPlanHires.status, "activation_pending"),
            lte(billingPlanHires.effectiveAt, now),
          ),
        )
        .limit(1);
      if (!hire || !hire.effectiveAt) return;
      if (!scheduledProviderIdentityIsValid(hire.providerSubscriptionId)) {
        await failScheduledProviderBinding(client, hire, now);
        return;
      }
      const [activatedSubscription] = await client
        .update(subscriptions)
        .set({
          currentPeriodEnd: addMonth(hire.effectiveAt),
          currentPeriodStart: hire.effectiveAt,
          status: "active",
          updatedAt: now,
        })
        .where(
          and(
            eq(subscriptions.id, hire.subscriptionId),
            eq(subscriptions.tenantId, hire.tenantId),
            eq(subscriptions.storeId, hire.storeId),
            eq(subscriptions.provider, hire.provider),
            inArray(subscriptions.status, ["active", "past_due"]),
            eq(
              subscriptions.providerSubscriptionId,
              hire.providerSubscriptionId,
            ),
          ),
        )
        .returning({ id: subscriptions.id });
      if (!activatedSubscription) {
        await failScheduledProviderBinding(client, hire, now);
        return;
      }
      const [activatedHire] = await client
        .update(billingPlanHires)
        .set({
          activatedAt: now,
          completedAt: now,
          failureCode: null,
          status: "paid_active",
          updatedAt: now,
        })
        .where(
          and(
            eq(billingPlanHires.id, hire.id),
            eq(billingPlanHires.storeId, hire.storeId),
            eq(billingPlanHires.subscriptionId, hire.subscriptionId),
            eq(billingPlanHires.tenantId, hire.tenantId),
            eq(billingPlanHires.status, "activation_pending"),
          ),
        )
        .returning({ id: billingPlanHires.id });
      if (!activatedHire) {
        throw new Error("Scheduled billing hire changed during finalization.");
      }
      await client.insert(billingPlanHireTransitions).values({
        fromStatus: "activation_pending",
        hireId: hire.id,
        metadata: { effectiveAt: hire.effectiveAt.toISOString() },
        storeId: hire.storeId,
        tenantId: hire.tenantId,
        toStatus: "paid_active",
      });
      await projectSelectedEntitlements(client, {
        source: "billing_plan_hire",
        storeId: hire.storeId,
        subscriptionId: hire.subscriptionId,
        tenantId: hire.tenantId,
      });
      await recordBillingProductEvent(client, {
        eventName: "contract_activated",
        hireId: hire.id,
        idempotencyKey: `billing-hire:${hire.id}:contract-activated`,
        properties: {
          catalogVersion: hire.catalogVersion,
          planId: hire.planId,
          quotedCents: hire.quotedCents,
        },
        providerPaymentId: hire.providerPaymentId,
        providerSubscriptionId: hire.providerSubscriptionId,
        storeId: hire.storeId,
        tenantId: hire.tenantId,
      });
      await recordPaidActivationAudit(client, {
        actorId: "billing_scheduled_activation",
        actorKind: "system",
        catalogVersion: hire.catalogVersion,
        hireId: hire.id,
        occurredAt: now,
        paymentId: candidate.paymentId,
        planId: hire.planId,
        providerPaymentId: hire.providerPaymentId,
        providerSubscriptionId: hire.providerSubscriptionId,
        quotedCents: hire.quotedCents,
        requestId: `billing_scheduled_activation_${hire.id}`,
        storeId: hire.storeId,
        tenantId: hire.tenantId,
      });
      finalized += 1;
    });
  }
  return finalized;
}

export function scheduledProviderIdentityIsValid(
  providerSubscriptionId: string | null,
) {
  return hasRealProviderSubscriptionId(providerSubscriptionId);
}

function addMonth(value: Date) {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}
