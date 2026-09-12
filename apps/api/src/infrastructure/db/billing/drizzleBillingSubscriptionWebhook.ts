import { and, eq } from "drizzle-orm";
import { subscriptions } from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderSubscriptionInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { applyProviderSubscriptionLifecycle } from "./drizzleBillingSubscriptionLifecycle.js";
import { lockEffectivePlanContract } from "./drizzleBillingContractLock.js";
import { validateSubscriptionExternalReference } from "./drizzleBillingSubscriptionReference.js";
import {
  bindUnknownProviderSubscription,
  preservesLocalFreeAccess,
} from "./drizzleBillingSubscriptionBinding.js";

export {
  canBindUnknownProviderSubscription,
  providerLifecyclePreservesFreeAccess,
  providerSubscriptionIdentityCanBind,
} from "./drizzleBillingSubscriptionBinding.js";

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
  const referenceConflict = await validateSubscriptionExternalReference(
    db,
    input,
    subscription,
  );
  if (referenceConflict) return referenceConflict;

  const storeId = subscription.storeId;
  await lockEffectivePlanContract(db, subscription.tenantId, storeId);
  const lifecycleResult = await applyProviderSubscriptionLifecycle(db, {
    currentPeriodEnd: input.currentPeriodEnd,
    eventOccurredAt: input.eventOccurredAt ?? null,
    expectedProvider: input.provider,
    expectedProviderSubscriptionId: input.providerSubscriptionId,
    providerEventId: input.providerEventId ?? null,
    preserveLocalAccess: await preservesLocalFreeAccess(db, {
      storeId,
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
    }),
    status,
    storeId,
    subscriptionId: subscription.id,
    tenantId: subscription.tenantId,
  });
  if (lifecycleResult === "conflict") {
    return {
      reason: "provider_subscription_identity_changed_during_processing",
      status: "pending_reconciliation",
      storeId: storeId as never,
      tenantId: subscription.tenantId as never,
    };
  }
  if (lifecycleResult === "applied") {
    await projectSubscriptionStore(db, {
      storeId,
      subscriptionId: subscription.id,
      tenantId: subscription.tenantId,
    });
  }
  return {
    status: "synced",
    storeId: storeId as never,
    tenantId: subscription.tenantId as never,
  };
}

async function projectSubscriptionStore(
  db: DrizzleBillingClient,
  input: { storeId: string; subscriptionId: string; tenantId: string },
) {
  await projectSelectedEntitlements(db, {
    source: "billing_selection",
    storeId: input.storeId,
    subscriptionId: input.subscriptionId,
    tenantId: input.tenantId,
  });
}
