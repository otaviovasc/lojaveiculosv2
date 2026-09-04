import { and, eq, isNull, lte, or } from "drizzle-orm";
import { subscriptions } from "@lojaveiculosv2/db";
import type { SaveBillingProviderSubscriptionInput } from "../../../domains/billing/ports/billingProviderRepository.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

type SubscriptionStatus = (typeof subscriptions.$inferSelect)["status"];

export async function saveDrizzleBillingProviderSubscription(
  db: DrizzleBillingClient,
  input: SaveBillingProviderSubscriptionInput,
): Promise<typeof subscriptions.$inferSelect | null> {
  return db.transaction(async (transaction) => {
    const tx = transaction as DrizzleBillingClient;
    await lockEffectivePlanContract(tx, input.tenantId, input.storeId);
    const [current] = await tx
      .select()
      .from(subscriptions)
      .where(scopedSubscription(input))
      .limit(1)
      .for("update");
    if (
      !current ||
      !providerSubscriptionStateCanApply({
        currentLifecycleObservedAt: current.providerLifecycleObservedAt,
        currentStatus: current.status,
        currentUpdatedAt: current.updatedAt,
        expectedStatus: input.expectedStatus,
        observationStartedAt: input.observationStartedAt,
      })
    ) {
      return null;
    }

    const [row] = await tx
      .update(subscriptions)
      .set({
        currentPeriodEnd: input.currentPeriodEnd,
        currentPeriodStart: input.currentPeriodStart,
        ...(input.observedAt
          ? { providerLifecycleObservedAt: input.observedAt }
          : {}),
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
        updatedAt: new Date(),
      })
      .where(
        and(
          scopedSubscription(input),
          providerSubscriptionIdentityCondition(input),
          ...(input.expectedStatus
            ? [eq(subscriptions.status, input.expectedStatus)]
            : []),
          ...(input.observationStartedAt
            ? [lte(subscriptions.updatedAt, input.observationStartedAt)]
            : []),
          ...(input.observationStartedAt
            ? [
                or(
                  isNull(subscriptions.providerLifecycleObservedAt),
                  lte(
                    subscriptions.providerLifecycleObservedAt,
                    input.observationStartedAt,
                  ),
                ),
              ]
            : []),
        ),
      )
      .returning();
    return row ?? null;
  });
}

export function providerSubscriptionStateCanApply(input: {
  currentLifecycleObservedAt: Date | null;
  currentStatus: SubscriptionStatus;
  currentUpdatedAt: Date;
  expectedStatus: SubscriptionStatus | undefined;
  observationStartedAt: Date | undefined;
}): boolean {
  if (input.expectedStatus && input.currentStatus !== input.expectedStatus) {
    return false;
  }
  if (!input.observationStartedAt) return true;
  if (input.currentUpdatedAt > input.observationStartedAt) return false;
  return !(
    input.currentLifecycleObservedAt &&
    input.currentLifecycleObservedAt > input.observationStartedAt
  );
}

function scopedSubscription(input: SaveBillingProviderSubscriptionInput) {
  return and(
    eq(subscriptions.id, input.subscriptionId),
    eq(subscriptions.tenantId, input.tenantId),
    eq(subscriptions.storeId, input.storeId),
  );
}

function providerSubscriptionIdentityCondition(
  input: SaveBillingProviderSubscriptionInput,
) {
  if (input.providerSubscriptionId) {
    return or(
      isNull(subscriptions.providerSubscriptionId),
      eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
    );
  }
  if (input.expectedProviderSubscriptionId) {
    return eq(
      subscriptions.providerSubscriptionId,
      input.expectedProviderSubscriptionId,
    );
  }
  return isNull(subscriptions.providerSubscriptionId);
}
