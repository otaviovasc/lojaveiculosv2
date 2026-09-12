import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import { activationPaymentCanBind } from "./drizzleBillingPaidActivationIdentity.js";
import { paidEvidenceCanActivateHire } from "./drizzleBillingPaidActivationRules.js";

export async function validatePaidActivationEvidence(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  input: UpsertBillingProviderPaymentInput,
) {
  if (!paidEvidenceCanActivateHire(hire, input.amountCents)) {
    await markHireReconciliationFailed(db, hire, input, "payment_mismatch");
    return false;
  }
  if (
    hire.status !== "paid_active" &&
    !activationPaymentCanBind(hire.providerPaymentId, input.providerPaymentId)
  ) {
    await markHireReconciliationFailed(
      db,
      hire,
      input,
      "provider_payment_binding_conflict",
    );
    return false;
  }
  return true;
}

export async function bindObservedPayment(
  db: DrizzleBillingClient,
  scope: {
    hireId: string;
    storeId: string | null;
    subscriptionId: string | null;
    tenantId: string;
  },
  input: UpsertBillingProviderPaymentInput,
) {
  if (!scope.storeId || !scope.subscriptionId) return;
  const [bound] = await db
    .update(billingPlanHires)
    .set({
      providerPaymentId: input.providerPaymentId,
      ...(input.providerSubscriptionId
        ? { providerSubscriptionId: input.providerSubscriptionId }
        : {}),
      status: "payment_pending",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingPlanHires.id, scope.hireId),
        eq(billingPlanHires.storeId, scope.storeId),
        eq(billingPlanHires.subscriptionId, scope.subscriptionId),
        eq(billingPlanHires.tenantId, scope.tenantId),
        inArray(billingPlanHires.status, [
          "created",
          "checkout_created",
          "payment_pending",
        ]),
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
  return Boolean(bound);
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
  const [failed] = await db
    .update(billingPlanHires)
    .set({
      failureCode,
      providerPaymentId: hire.providerPaymentId ?? input.providerPaymentId,
      status: "reconciliation_failed",
      updatedAt: new Date(),
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
  if (!failed) return false;
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
  return true;
}
