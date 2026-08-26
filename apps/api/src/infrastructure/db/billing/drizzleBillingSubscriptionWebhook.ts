import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  billingPlanHires,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderSubscriptionInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { resolveStoreId } from "./drizzleBillingWebhookScope.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import { applyProviderSubscriptionLifecycle } from "./drizzleBillingSubscriptionLifecycle.js";

export async function syncProviderSubscription(
  db: DrizzleBillingClient,
  input: SyncBillingProviderSubscriptionInput,
): Promise<BillingProviderSyncResult> {
  const status = input.status;
  if (status === "unknown") {
    return {
      reason: "unknown_provider_subscription_status",
      status: "pending_reconciliation",
      storeId: null,
      tenantId: null,
    };
  }
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, input.provider),
        eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
      ),
    )
    .limit(1);
  if (!subscription) {
    return bindUnknownProviderSubscription(db, { ...input, status });
  }

  const storeId = await resolveStoreId(db, subscription.id);
  await applyProviderSubscriptionLifecycle(db, {
    currentPeriodEnd: input.currentPeriodEnd,
    eventOccurredAt: input.eventOccurredAt ?? null,
    providerEventId: input.providerEventId ?? null,
    preserveLocalAccess: await preservesLocalFreeAccess(db, subscription.id),
    status,
    storeId,
    subscriptionId: subscription.id,
    tenantId: subscription.tenantId,
  });
  await projectSubscriptionStores(db, subscription.id, subscription.tenantId);
  return {
    status: "synced",
    storeId: storeId as never,
    tenantId: subscription.tenantId as never,
  };
}

async function bindUnknownProviderSubscription(
  db: DrizzleBillingClient,
  input: ExcludeUnknownStatusInput,
): Promise<BillingProviderSyncResult> {
  if (!input.externalReference) return unknownSubscription();
  const [hire] = await db
    .select()
    .from(billingPlanHires)
    .where(eq(billingPlanHires.id, input.externalReference))
    .limit(1);
  if (!hire) return unknownSubscription();
  if (
    !canBindUnknownProviderSubscription(
      hire.status,
      await preservesLocalFreeAccess(db, hire.subscriptionId),
    )
  ) {
    return {
      status: "synced",
      storeId: hire.storeId as never,
      tenantId: hire.tenantId as never,
    };
  }
  await db
    .update(billingPlanHires)
    .set({
      providerSubscriptionId: input.providerSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(billingPlanHires.id, hire.id));
  await db
    .update(subscriptions)
    .set({
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.tenantId, hire.tenantId),
      ),
    );
  await applyProviderSubscriptionLifecycle(db, {
    currentPeriodEnd: input.currentPeriodEnd,
    eventOccurredAt: input.eventOccurredAt ?? null,
    providerEventId: input.providerEventId ?? null,
    preserveLocalAccess: false,
    status: input.status,
    storeId: hire.storeId,
    subscriptionId: hire.subscriptionId,
    tenantId: hire.tenantId,
  });
  await recordBillingProductEvent(db, {
    eventName: "provider_bound",
    hireId: hire.id,
    idempotencyKey: `billing-hire:${hire.id}:subscription-bound`,
    providerSubscriptionId: input.providerSubscriptionId,
    storeId: hire.storeId,
    tenantId: hire.tenantId,
  });
  return {
    status: "synced",
    storeId: hire.storeId as never,
    tenantId: hire.tenantId as never,
  };
}

export function canBindUnknownProviderSubscription(
  hireStatus: (typeof billingPlanHires.$inferSelect)["status"],
  preservesFreeAccess: boolean,
) {
  return (
    !preservesFreeAccess ||
    [
      "created",
      "checkout_created",
      "payment_pending",
      "activation_pending",
    ].includes(hireStatus)
  );
}

type ExcludeUnknownStatusInput = SyncBillingProviderSubscriptionInput & {
  status: Exclude<SyncBillingProviderSubscriptionInput["status"], "unknown">;
};

function unknownSubscription(): BillingProviderSyncResult {
  return {
    reason: "unknown_subscription",
    status: "pending_reconciliation",
    storeId: null,
    tenantId: null,
  };
}

async function preservesLocalFreeAccess(
  db: DrizzleBillingClient,
  subscriptionId: string,
) {
  const now = new Date();
  const [scheduledDowngrade] = await db
    .select({ id: billingPlanHires.id })
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.subscriptionId, subscriptionId),
        eq(billingPlanHires.status, "downgrade_scheduled"),
      ),
    )
    .limit(1);
  if (scheduledDowngrade) return true;
  const [effectivePaid] = await db
    .select({ id: subscriptionItems.id })
    .from(subscriptionItems)
    .where(
      and(
        eq(subscriptionItems.subscriptionId, subscriptionId),
        eq(subscriptionItems.itemType, "plan"),
        gt(subscriptionItems.unitAmountCents, 0),
        or(
          isNull(subscriptionItems.startsAt),
          lte(subscriptionItems.startsAt, now),
        ),
        or(isNull(subscriptionItems.endsAt), gt(subscriptionItems.endsAt, now)),
      ),
    )
    .limit(1);
  return providerLifecyclePreservesFreeAccess(false, Boolean(effectivePaid));
}

async function projectSubscriptionStores(
  db: DrizzleBillingClient,
  subscriptionId: string,
  tenantId: string,
) {
  const affectedStores = await db
    .selectDistinct({ storeId: subscriptionItems.storeId })
    .from(subscriptionItems)
    .where(eq(subscriptionItems.subscriptionId, subscriptionId));
  for (const affected of affectedStores) {
    if (!affected.storeId) continue;
    await projectSelectedEntitlements(db, {
      source: "billing_selection",
      storeId: affected.storeId,
      subscriptionId,
      tenantId,
    });
  }
}

export function providerLifecyclePreservesFreeAccess(
  hasScheduledFreeDowngrade: boolean,
  hasEffectivePaidContract: boolean,
) {
  return hasScheduledFreeDowngrade || !hasEffectivePaidContract;
}
