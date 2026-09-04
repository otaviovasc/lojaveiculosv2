import { and, eq } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptionItems,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { endActivePlanItems } from "./drizzleBillingPlanItemTransitions.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { bindScheduledProviderSubscription } from "./drizzleBillingScheduledProviderBinding.js";

export async function schedulePaidPlanActivation(
  db: DrizzleBillingClient,
  args: {
    activationAt: Date;
    hire: typeof billingPlanHires.$inferSelect;
    input: UpsertBillingProviderPaymentInput;
    observedAt: Date;
    paymentId: string;
  },
) {
  const { activationAt, hire, input, observedAt, paymentId } = args;
  if (!(await bindScheduledProviderSubscription(db, hire, input, observedAt))) {
    return;
  }
  if (hire.effectiveSubscriptionItemId) return;
  await endActivePlanItems(db, hire.storeId, hire.tenantId, activationAt);
  const [scheduled] = await db
    .insert(subscriptionItems)
    .values({
      itemType: "plan",
      planId: hire.planId,
      quantity: 1,
      startsAt: activationAt,
      storeId: hire.storeId,
      subscriptionId: hire.subscriptionId,
      tenantId: hire.tenantId,
      unitAmountCents: hire.quotedCents,
    })
    .returning({ id: subscriptionItems.id });
  if (!scheduled)
    throw new Error("Scheduled billing contract was not persisted.");
  const [updatedHire] = await db
    .update(billingPlanHires)
    .set({
      effectiveSubscriptionItemId: scheduled.id,
      failureCode: null,
      providerPaymentId: input.providerPaymentId,
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
      status: "activation_pending",
      updatedAt: observedAt,
    })
    .where(
      and(
        eq(billingPlanHires.id, hire.id),
        eq(billingPlanHires.storeId, hire.storeId),
        eq(billingPlanHires.subscriptionId, hire.subscriptionId),
        eq(billingPlanHires.tenantId, hire.tenantId),
        eq(billingPlanHires.status, hire.status),
      ),
    )
    .returning({ id: billingPlanHires.id });
  if (!updatedHire) {
    throw new Error("Scheduled billing hire changed during activation.");
  }
  if (hire.status !== "activation_pending") {
    await db.insert(billingPlanHireTransitions).values({
      fromStatus: hire.status,
      hireId: hire.id,
      metadata: { effectiveAt: activationAt.toISOString(), paymentId },
      providerEventId: input.providerEventId,
      storeId: hire.storeId,
      tenantId: hire.tenantId,
      toStatus: "activation_pending",
    });
  }
}
