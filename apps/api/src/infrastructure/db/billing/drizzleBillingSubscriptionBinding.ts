import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  billingPlanHires,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderSubscriptionInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { applyProviderSubscriptionLifecycle } from "./drizzleBillingSubscriptionLifecycle.js";

type BindableSubscriptionInput = SyncBillingProviderSubscriptionInput & {
  status: Exclude<SyncBillingProviderSubscriptionInput["status"], "unknown">;
};

export async function bindUnknownProviderSubscription(
  db: DrizzleBillingClient,
  input: BindableSubscriptionInput,
): Promise<BillingProviderSyncResult> {
  if (!input.externalReference) return unknownSubscription();
  const [hire] = await db
    .select()
    .from(billingPlanHires)
    .where(eq(billingPlanHires.id, input.externalReference))
    .limit(1);
  if (!hire) return unknownSubscription();
  await lockEffectivePlanContract(db, hire.tenantId, hire.storeId);
  const [currentHire] = await db
    .select()
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.subscriptionId, hire.subscriptionId),
        eq(billingPlanHires.storeId, hire.storeId),
        eq(billingPlanHires.tenantId, hire.tenantId),
      ),
    )
    .orderBy(desc(billingPlanHires.createdAt), desc(billingPlanHires.id))
    .limit(1);
  if (currentHire?.id !== hire.id) return staleSubscriptionIdentity(hire);

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.storeId, hire.storeId),
        eq(subscriptions.tenantId, hire.tenantId),
      ),
    )
    .limit(1)
    .for("update");
  if (
    !subscription ||
    !providerSubscriptionIdentityCanBind({
      currentHireId: currentHire.id,
      hireProviderSubscriptionId: currentHire.providerSubscriptionId,
      incomingProviderSubscriptionId: input.providerSubscriptionId,
      localProviderSubscriptionId: subscription.providerSubscriptionId,
      referencedHireId: hire.id,
    })
  ) {
    return staleSubscriptionIdentity(hire);
  }
  if (
    !canBindUnknownProviderSubscription(
      currentHire.status,
      await preservesLocalFreeAccess(db, {
        storeId: hire.storeId,
        subscriptionId: hire.subscriptionId,
        tenantId: hire.tenantId,
      }),
    )
  ) {
    return syncedHireScope(hire);
  }
  await db
    .update(billingPlanHires)
    .set({
      providerSubscriptionId: input.providerSubscriptionId,
      updatedAt: new Date(),
    })
    .where(eq(billingPlanHires.id, hire.id));
  const [boundSubscription] = await db
    .update(subscriptions)
    .set({
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.storeId, hire.storeId),
        eq(subscriptions.tenantId, hire.tenantId),
        or(
          isNull(subscriptions.providerSubscriptionId),
          eq(
            subscriptions.providerSubscriptionId,
            input.providerSubscriptionId,
          ),
        ),
      ),
    )
    .returning({ id: subscriptions.id });
  if (!boundSubscription) return staleSubscriptionIdentity(hire);
  await applyProviderSubscriptionLifecycle(db, {
    currentPeriodEnd: input.currentPeriodEnd,
    eventOccurredAt: input.eventOccurredAt ?? null,
    expectedProvider: input.provider,
    expectedProviderSubscriptionId: input.providerSubscriptionId,
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
  return syncedHireScope(hire);
}

export function providerSubscriptionIdentityCanBind(input: {
  currentHireId: string;
  hireProviderSubscriptionId: string | null;
  incomingProviderSubscriptionId: string;
  localProviderSubscriptionId: string | null;
  referencedHireId: string;
}) {
  return (
    input.currentHireId === input.referencedHireId &&
    (input.localProviderSubscriptionId === null ||
      input.localProviderSubscriptionId ===
        input.incomingProviderSubscriptionId) &&
    (input.hireProviderSubscriptionId === null ||
      input.hireProviderSubscriptionId === input.incomingProviderSubscriptionId)
  );
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

export async function preservesLocalFreeAccess(
  db: DrizzleBillingClient,
  input: { storeId: string; subscriptionId: string; tenantId: string },
) {
  const now = new Date();
  const [scheduledDowngrade] = await db
    .select({ id: billingPlanHires.id })
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.subscriptionId, input.subscriptionId),
        eq(billingPlanHires.storeId, input.storeId),
        eq(billingPlanHires.tenantId, input.tenantId),
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
        eq(subscriptionItems.subscriptionId, input.subscriptionId),
        eq(subscriptionItems.storeId, input.storeId),
        eq(subscriptionItems.tenantId, input.tenantId),
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

export function providerLifecyclePreservesFreeAccess(
  hasScheduledFreeDowngrade: boolean,
  hasEffectivePaidContract: boolean,
) {
  return hasScheduledFreeDowngrade || !hasEffectivePaidContract;
}

function unknownSubscription(): BillingProviderSyncResult {
  return {
    reason: "unknown_subscription",
    status: "pending_reconciliation",
    storeId: null,
    tenantId: null,
  };
}

function staleSubscriptionIdentity(
  hire: Pick<typeof billingPlanHires.$inferSelect, "storeId" | "tenantId">,
): BillingProviderSyncResult {
  return {
    reason: "stale_or_conflicting_subscription_identity",
    status: "pending_reconciliation",
    storeId: hire.storeId as never,
    tenantId: hire.tenantId as never,
  };
}

function syncedHireScope(
  hire: Pick<typeof billingPlanHires.$inferSelect, "storeId" | "tenantId">,
): BillingProviderSyncResult {
  return {
    status: "synced",
    storeId: hire.storeId as never,
    tenantId: hire.tenantId as never,
  };
}
