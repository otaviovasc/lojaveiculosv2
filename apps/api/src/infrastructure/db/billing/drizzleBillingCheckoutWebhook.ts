import { and, eq } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingCustomers,
  subscriptions,
} from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderCheckoutInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { projectSelectedEntitlements } from "./drizzleBillingEntitlementProjection.js";

export async function syncProviderCheckout(
  db: DrizzleBillingClient,
  input: SyncBillingProviderCheckoutInput,
): Promise<BillingProviderSyncResult> {
  return db.transaction((tx) =>
    syncProviderCheckoutTransaction(tx as DrizzleBillingClient, input),
  );
}

async function syncProviderCheckoutTransaction(
  db: DrizzleBillingClient,
  input: SyncBillingProviderCheckoutInput,
): Promise<BillingProviderSyncResult> {
  const [checkout] = await db
    .update(billingCheckoutSessions)
    .set({
      raw: input.raw,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingCheckoutSessions.provider, input.provider),
        eq(
          billingCheckoutSessions.providerCheckoutId,
          input.providerCheckoutId,
        ),
      ),
    )
    .returning();

  if (!checkout) {
    return {
      reason: "unknown_checkout",
      status: "ignored",
      storeId: null,
      tenantId: null,
    };
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, checkout.subscriptionId))
    .limit(1);

  if (input.providerCustomerId && subscription) {
    await db
      .update(billingCustomers)
      .set({
        provider: input.provider,
        providerCustomerId: input.providerCustomerId,
        updatedAt: new Date(),
      })
      .where(eq(billingCustomers.id, subscription.billingCustomerId));
  }

  if (input.status === "paid") {
    await db
      .update(subscriptions)
      .set({
        ...(input.currentPeriodEnd
          ? { currentPeriodEnd: input.currentPeriodEnd }
          : {}),
        ...(input.providerSubscriptionId
          ? { providerSubscriptionId: input.providerSubscriptionId }
          : {}),
        provider: input.provider,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, checkout.subscriptionId));
    if (checkout.storeId) {
      await projectSelectedEntitlements(db, {
        source: "billing_checkout",
        storeId: checkout.storeId,
        subscriptionId: checkout.subscriptionId,
        tenantId: checkout.tenantId,
      });
    }
  }

  return {
    status: "synced",
    storeId: checkout.storeId as never,
    tenantId: checkout.tenantId as never,
  };
}
