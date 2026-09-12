import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { billingProviderReconciliations } from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

type SubscriptionCancellationScope = {
  providerSubscriptionId: string | null;
  storeId: string;
  subscriptionId: string;
  tenantId: string;
};

export async function enqueueSubscriptionCancellation(
  db: DrizzleBillingClient,
  input: SubscriptionCancellationScope & { availableAt: Date },
) {
  if (!input.providerSubscriptionId) return;
  await db
    .insert(billingProviderReconciliations)
    .values({
      availableAt: input.availableAt,
      kind: "subscription_cancellation",
      status: "queued",
      storeId: input.storeId,
      subscriptionId: input.subscriptionId,
      targetProviderSubscriptionId: input.providerSubscriptionId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: {
        availableAt: input.availableAt,
        completedAt: null,
        lastError: null,
        processingStartedAt: null,
        processingToken: null,
        status: "queued",
        storeId: input.storeId,
        targetProviderSubscriptionId: input.providerSubscriptionId,
        tenantId: input.tenantId,
        updatedAt: input.availableAt,
      },
      setWhere: ne(billingProviderReconciliations.status, "processing"),
      target: [
        billingProviderReconciliations.kind,
        billingProviderReconciliations.subscriptionId,
        billingProviderReconciliations.targetProviderSubscriptionId,
      ],
      targetWhere: isNotNull(
        billingProviderReconciliations.targetProviderSubscriptionId,
      ),
    });
}

export async function cancelSubscriptionCancellationIntent(
  db: DrizzleBillingClient,
  input: SubscriptionCancellationScope & {
    cancelledAt: Date;
  },
) {
  if (!input.providerSubscriptionId) {
    return { state: "none" as const, targetProviderSubscriptionId: null };
  }
  const scope = cancellationIntentScope(input);
  const [revoked] = await db
    .update(billingProviderReconciliations)
    .set({
      completedAt: input.cancelledAt,
      lastError: null,
      processingStartedAt: null,
      processingToken: null,
      status: "succeeded",
      updatedAt: input.cancelledAt,
    })
    .where(
      and(
        scope,
        inArray(billingProviderReconciliations.status, ["queued", "retry"]),
      ),
    )
    .returning({
      targetProviderSubscriptionId:
        billingProviderReconciliations.targetProviderSubscriptionId,
    });
  if (revoked) {
    return {
      state: "revoked" as const,
      targetProviderSubscriptionId: revoked.targetProviderSubscriptionId,
    };
  }
  const [current] = await db
    .select({
      status: billingProviderReconciliations.status,
      targetProviderSubscriptionId:
        billingProviderReconciliations.targetProviderSubscriptionId,
    })
    .from(billingProviderReconciliations)
    .where(scope)
    .limit(1);
  if (!current) {
    return { state: "none" as const, targetProviderSubscriptionId: null };
  }
  return {
    state:
      current.status === "processing"
        ? ("in_flight" as const)
        : ("completed" as const),
    targetProviderSubscriptionId: current.targetProviderSubscriptionId,
  };
}

function cancellationIntentScope(input: SubscriptionCancellationScope) {
  return and(
    eq(billingProviderReconciliations.kind, "subscription_cancellation"),
    eq(billingProviderReconciliations.subscriptionId, input.subscriptionId),
    eq(billingProviderReconciliations.tenantId, input.tenantId),
    eq(billingProviderReconciliations.storeId, input.storeId),
    input.providerSubscriptionId
      ? eq(
          billingProviderReconciliations.targetProviderSubscriptionId,
          input.providerSubscriptionId,
        )
      : undefined,
  );
}
