import { and, eq } from "drizzle-orm";
import {
  billingCustomers,
  payments,
  subscriptionItems,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function resolvePaymentScope(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
) {
  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.provider, input.provider),
        eq(payments.providerPaymentId, input.providerPaymentId),
      ),
    )
    .limit(1);
  if (existingPayment) {
    return {
      storeId: existingPayment.storeId,
      subscriptionId: existingPayment.subscriptionId,
      tenantId: existingPayment.tenantId,
    };
  }

  if (input.providerSubscriptionId) {
    const subscription = await findSubscription(db, input);
    if (subscription) {
      return {
        storeId: await resolveStoreId(db, subscription.id),
        subscriptionId: subscription.id,
        tenantId: subscription.tenantId,
      };
    }
  }

  if (!input.providerCustomerId) return null;
  const [customer] = await db
    .select()
    .from(billingCustomers)
    .where(
      and(
        eq(billingCustomers.provider, input.provider),
        eq(billingCustomers.providerCustomerId, input.providerCustomerId),
      ),
    )
    .limit(1);
  return customer
    ? { storeId: null, subscriptionId: null, tenantId: customer.tenantId }
    : null;
}

export async function resolveStoreId(
  db: DrizzleBillingClient,
  subscriptionId: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(subscriptionItems)
    .where(eq(subscriptionItems.subscriptionId, subscriptionId))
    .limit(20);
  const storeIds = [...new Set(rows.map((row) => row.storeId).filter(Boolean))];
  return storeIds.length === 1 ? (storeIds[0] ?? null) : null;
}

async function findSubscription(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
) {
  if (!input.providerSubscriptionId) return null;
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
  return subscription ?? null;
}
