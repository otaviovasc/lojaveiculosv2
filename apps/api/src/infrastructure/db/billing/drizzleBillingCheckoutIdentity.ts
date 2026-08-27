import { and, eq, isNull, or } from "drizzle-orm";
import {
  billingCustomers,
  billingPlanHires,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { billingCheckoutSessions } from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderCheckoutInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import { providerIdentityCanBind } from "./drizzleBillingProviderIdentity.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function validateAndBindCheckoutProviderIdentity(
  db: DrizzleBillingClient,
  checkout: typeof billingCheckoutSessions.$inferSelect,
  input: SyncBillingProviderCheckoutInput,
): Promise<BillingProviderSyncResult | null> {
  const [subscription] = await db
    .select({
      billingCustomerId: subscriptions.billingCustomerId,
      providerCustomerId: billingCustomers.providerCustomerId,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
    })
    .from(subscriptions)
    .innerJoin(
      billingCustomers,
      and(
        eq(billingCustomers.id, subscriptions.billingCustomerId),
        eq(billingCustomers.tenantId, subscriptions.tenantId),
      ),
    )
    .where(
      and(
        eq(subscriptions.id, checkout.subscriptionId),
        eq(subscriptions.tenantId, checkout.tenantId),
        eq(subscriptions.storeId, checkout.storeId ?? ""),
      ),
    )
    .limit(1);
  if (
    !providerIdentityCanBind(
      subscription?.providerCustomerId ?? null,
      input.providerCustomerId,
    )
  ) {
    return checkoutReconciliation(
      checkout,
      "provider_customer_identity_conflict",
    );
  }
  if (
    !providerIdentityCanBind(
      subscription?.providerSubscriptionId ?? null,
      input.providerSubscriptionId,
    )
  ) {
    return checkoutReconciliation(
      checkout,
      "provider_subscription_identity_conflict",
    );
  }
  const hireConflict = await checkoutHireIdentityConflicts(db, checkout, input);
  if (hireConflict) return hireConflict;
  if (!input.providerCustomerId || !subscription) return null;

  const [customer] = await db
    .update(billingCustomers)
    .set({
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingCustomers.id, subscription.billingCustomerId),
        eq(billingCustomers.tenantId, checkout.tenantId),
        or(
          isNull(billingCustomers.providerCustomerId),
          eq(billingCustomers.providerCustomerId, input.providerCustomerId),
        ),
      ),
    )
    .returning({ id: billingCustomers.id });
  return customer
    ? null
    : checkoutReconciliation(checkout, "provider_customer_identity_conflict");
}

async function checkoutHireIdentityConflicts(
  db: DrizzleBillingClient,
  checkout: typeof billingCheckoutSessions.$inferSelect,
  input: SyncBillingProviderCheckoutInput,
) {
  if (input.status !== "paid" || !input.providerSubscriptionId) return null;
  const [hire] = await db
    .select({ providerSubscriptionId: billingPlanHires.providerSubscriptionId })
    .from(billingPlanHires)
    .where(
      and(
        eq(billingPlanHires.id, checkout.planHireId ?? ""),
        eq(billingPlanHires.tenantId, checkout.tenantId),
        eq(billingPlanHires.storeId, checkout.storeId ?? ""),
      ),
    )
    .limit(1);
  return providerIdentityCanBind(
    hire?.providerSubscriptionId ?? null,
    input.providerSubscriptionId,
  )
    ? null
    : checkoutReconciliation(
        checkout,
        "provider_subscription_identity_conflict",
      );
}

export function checkoutReconciliation(
  checkout: typeof billingCheckoutSessions.$inferSelect,
  reason: string,
): BillingProviderSyncResult {
  return {
    reason,
    status: "pending_reconciliation",
    storeId: checkout.storeId as never,
    tenantId: checkout.tenantId as never,
  };
}
