import { and, eq, isNull, or } from "drizzle-orm";
import { billingCustomers, subscriptions } from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { providerIdentityCanBind } from "./drizzleBillingProviderIdentity.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function bindPaidPlanProviderCustomer(
  db: DrizzleBillingClient,
  subscriptionId: string,
  storeId: string,
  tenantId: string,
  input: UpsertBillingProviderPaymentInput,
  now: Date,
) {
  if (!input.providerCustomerId) return true;
  const [subscription] = await db
    .select({
      billingCustomerId: subscriptions.billingCustomerId,
      providerCustomerId: billingCustomers.providerCustomerId,
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
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.storeId, storeId),
      ),
    )
    .limit(1);
  if (
    !subscription ||
    !providerIdentityCanBind(
      subscription.providerCustomerId,
      input.providerCustomerId,
    )
  ) {
    return false;
  }
  const [bound] = await db
    .update(billingCustomers)
    .set({
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
      updatedAt: now,
    })
    .where(
      and(
        eq(billingCustomers.id, subscription.billingCustomerId),
        eq(billingCustomers.tenantId, tenantId),
        or(
          isNull(billingCustomers.providerCustomerId),
          eq(billingCustomers.providerCustomerId, input.providerCustomerId),
        ),
      ),
    )
    .returning({ id: billingCustomers.id });
  return Boolean(bound);
}
