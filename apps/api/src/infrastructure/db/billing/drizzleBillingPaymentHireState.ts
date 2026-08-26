import { eq } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";

export async function bindObservedPayment(
  db: DrizzleBillingClient,
  hireId: string,
  input: UpsertBillingProviderPaymentInput,
) {
  const [hire] = await db
    .select({ status: billingPlanHires.status })
    .from(billingPlanHires)
    .where(eq(billingPlanHires.id, hireId))
    .limit(1);
  if (!hire || !observedPaymentCanSetPending(hire.status)) {
    return;
  }
  await db
    .update(billingPlanHires)
    .set({
      providerPaymentId: input.providerPaymentId,
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
      status: "payment_pending",
      updatedAt: new Date(),
    })
    .where(eq(billingPlanHires.id, hireId));
}

export function observedPaymentCanSetPending(
  status: (typeof billingPlanHires.$inferSelect)["status"],
) {
  return ["created", "checkout_created", "payment_pending"].includes(status);
}

export async function markHireReconciliationFailed(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  input: UpsertBillingProviderPaymentInput,
  failureCode: string,
) {
  await db
    .update(billingPlanHires)
    .set({
      failureCode,
      providerPaymentId: input.providerPaymentId,
      status: "reconciliation_failed",
      updatedAt: new Date(),
    })
    .where(eq(billingPlanHires.id, hire.id));
  await db.insert(billingPlanHireTransitions).values({
    failureCode,
    fromStatus: hire.status,
    hireId: hire.id,
    metadata: {},
    providerEventId: input.providerEventId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
    toStatus: "reconciliation_failed",
  });
  await recordBillingProductEvent(db, {
    eventName: "reconciliation_failed",
    hireId: hire.id,
    idempotencyKey: `billing-hire:${hire.id}:reconciliation:${input.providerEventId ?? input.providerPaymentId}:${failureCode}`,
    properties: { failureCode, source: "payment" },
    providerEventId: input.providerEventId,
    providerPaymentId: input.providerPaymentId,
    providerSubscriptionId: input.providerSubscriptionId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
}
