import { and, eq } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingCustomers,
  billingPlanHires,
  billingPlanHireTransitions,
  subscriptions,
} from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderCheckoutInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

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
      raw: {
        providerCheckoutId: input.providerCheckoutId,
        status: input.status,
      },
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
      status: "pending_reconciliation",
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
    const [before] = await db
      .select()
      .from(billingPlanHires)
      .where(eq(billingPlanHires.id, checkout.planHireId ?? ""))
      .limit(1);
    if (!before || before.status === "paid_active") {
      return {
        status: "synced",
        storeId: checkout.storeId as never,
        tenantId: checkout.tenantId as never,
      };
    }
    if (
      ![
        "created",
        "checkout_created",
        "payment_pending",
        "activation_pending",
      ].includes(before.status)
    ) {
      return {
        reason: "non_monotonic_checkout_event",
        status: "pending_reconciliation",
        storeId: checkout.storeId as never,
        tenantId: checkout.tenantId as never,
      };
    }
    const [hire] = await db
      .update(billingPlanHires)
      .set({
        ...(input.providerSubscriptionId
          ? { providerSubscriptionId: input.providerSubscriptionId }
          : {}),
        status: "activation_pending",
        updatedAt: new Date(),
      })
      .where(eq(billingPlanHires.id, checkout.planHireId ?? ""))
      .returning();
    if (hire) {
      await db.insert(billingPlanHireTransitions).values({
        fromStatus: before.status,
        hireId: hire.id,
        metadata: { providerCheckoutId: input.providerCheckoutId },
        storeId: hire.storeId,
        tenantId: hire.tenantId,
        toStatus: "activation_pending",
      });
    }
  }

  if (input.status === "cancelled" || input.status === "expired") {
    const [before] = await db
      .select()
      .from(billingPlanHires)
      .where(eq(billingPlanHires.id, checkout.planHireId ?? ""))
      .limit(1);
    if (
      before &&
      !["paid_active", "downgrade_scheduled", "cancelled", "expired"].includes(
        before.status,
      )
    ) {
      const [hire] = await db
        .update(billingPlanHires)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(billingPlanHires.id, before.id))
        .returning();
      if (hire) {
        await db.insert(billingPlanHireTransitions).values({
          fromStatus: before.status,
          hireId: hire.id,
          metadata: { providerCheckoutId: input.providerCheckoutId },
          storeId: hire.storeId,
          tenantId: hire.tenantId,
          toStatus: input.status,
        });
      }
    }
  }

  return {
    status: "synced",
    storeId: checkout.storeId as never,
    tenantId: checkout.tenantId as never,
  };
}
