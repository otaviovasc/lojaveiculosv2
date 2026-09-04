import { and, eq, or, isNull } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export function hasRealProviderSubscriptionId(
  providerSubscriptionId: string | null,
): providerSubscriptionId is string {
  return Boolean(
    providerSubscriptionId &&
    providerSubscriptionId.trim() &&
    !providerSubscriptionId.startsWith("local_"),
  );
}

export function activationPaymentCanBind(
  currentProviderPaymentId: string | null,
  incomingProviderPaymentId: string,
) {
  return (
    currentProviderPaymentId === null ||
    currentProviderPaymentId === incomingProviderPaymentId
  );
}

export async function loadPlanHireForActivation(
  db: DrizzleBillingClient,
  input: { hireId: string; storeId: string; tenantId: string },
) {
  const [hire] = await db
    .select()
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.id, input.hireId),
        eq(billingPlanHires.storeId, input.storeId),
        eq(billingPlanHires.tenantId, input.tenantId),
      ),
    )
    .limit(1);
  return hire ?? null;
}

export async function stageActivationPendingProviderIdentity(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  input: UpsertBillingProviderPaymentInput,
) {
  if (
    !activationPaymentCanBind(hire.providerPaymentId, input.providerPaymentId)
  ) {
    return false;
  }
  const now = new Date();
  const [updated] = await db
    .update(billingPlanHires)
    .set({
      failureCode: null,
      providerPaymentId: input.providerPaymentId,
      status: "activation_pending",
      updatedAt: now,
    })
    .where(
      and(
        eq(billingPlanHires.id, hire.id),
        eq(billingPlanHires.storeId, hire.storeId),
        eq(billingPlanHires.subscriptionId, hire.subscriptionId),
        eq(billingPlanHires.tenantId, hire.tenantId),
        eq(billingPlanHires.status, hire.status),
        or(
          isNull(billingPlanHires.providerPaymentId),
          eq(billingPlanHires.providerPaymentId, input.providerPaymentId),
        ),
      ),
    )
    .returning({ id: billingPlanHires.id });
  if (!updated) return false;
  if (hire.status !== "activation_pending") {
    await db.insert(billingPlanHireTransitions).values({
      fromStatus: hire.status,
      hireId: hire.id,
      metadata: { reason: "provider_subscription_identity_pending" },
      providerEventId: input.providerEventId,
      storeId: hire.storeId,
      tenantId: hire.tenantId,
      toStatus: "activation_pending",
    });
  }
  return true;
}

export async function bindPaidActiveProviderIdentity(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  input: UpsertBillingProviderPaymentInput,
) {
  const providerSubscriptionId = input.providerSubscriptionId;
  if (!hasRealProviderSubscriptionId(providerSubscriptionId)) return false;
  const [subscription] = await db
    .select({
      provider: subscriptions.provider,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.storeId, hire.storeId),
        eq(subscriptions.tenantId, hire.tenantId),
      ),
    )
    .limit(1);
  if (
    !subscription ||
    subscription.provider !== input.provider ||
    !identityCanBind(hire.providerSubscriptionId, providerSubscriptionId) ||
    !identityCanBind(
      subscription.providerSubscriptionId,
      providerSubscriptionId,
    )
  ) {
    return false;
  }
  const now = new Date();
  const [boundSubscription] = await db
    .update(subscriptions)
    .set({ providerSubscriptionId, updatedAt: now })
    .where(
      and(
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.storeId, hire.storeId),
        eq(subscriptions.tenantId, hire.tenantId),
        or(
          isNull(subscriptions.providerSubscriptionId),
          eq(subscriptions.providerSubscriptionId, providerSubscriptionId),
        ),
      ),
    )
    .returning({ id: subscriptions.id });
  const [boundHire] = await db
    .update(billingPlanHires)
    .set({
      providerPaymentId: hire.providerPaymentId ?? input.providerPaymentId,
      providerSubscriptionId,
      updatedAt: now,
    })
    .where(
      and(
        eq(billingPlanHires.id, hire.id),
        eq(billingPlanHires.storeId, hire.storeId),
        eq(billingPlanHires.tenantId, hire.tenantId),
        eq(billingPlanHires.status, "paid_active"),
        or(
          isNull(billingPlanHires.providerSubscriptionId),
          eq(billingPlanHires.providerSubscriptionId, providerSubscriptionId),
        ),
      ),
    )
    .returning({ id: billingPlanHires.id });
  if (!boundSubscription || !boundHire) {
    throw new Error("Paid billing provider identity changed during binding.");
  }
  return true;
}

export function identityCanBind(current: string | null, incoming: string) {
  return current === null || current === incoming;
}
