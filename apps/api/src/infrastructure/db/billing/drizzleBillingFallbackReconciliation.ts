import { billingProviderReconciliations } from "@lojaveiculosv2/db";
import { isNull } from "drizzle-orm";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function enqueueFreeFallbackReconciliation(
  db: DrizzleBillingClient,
  subscription: {
    id: string;
    providerSubscriptionId: string | null;
    storeId: string;
    tenantId: string;
  },
  now: Date,
) {
  if (!needsFreeFallbackReconciliation(subscription.providerSubscriptionId)) {
    return;
  }
  await db
    .insert(billingProviderReconciliations)
    .values({
      availableAt: now,
      kind: "free_fallback",
      status: "queued",
      storeId: subscription.storeId,
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
    })
    .onConflictDoUpdate({
      set: {
        availableAt: now,
        completedAt: null,
        lastError: null,
        processingStartedAt: null,
        processingToken: null,
        status: "queued",
        updatedAt: now,
      },
      target: [
        billingProviderReconciliations.kind,
        billingProviderReconciliations.subscriptionId,
      ],
      targetWhere: isNull(
        billingProviderReconciliations.targetProviderSubscriptionId,
      ),
    });
}

export function needsFreeFallbackReconciliation(
  providerSubscriptionId: string | null,
) {
  return Boolean(
    providerSubscriptionId && !providerSubscriptionId.startsWith("local_"),
  );
}
