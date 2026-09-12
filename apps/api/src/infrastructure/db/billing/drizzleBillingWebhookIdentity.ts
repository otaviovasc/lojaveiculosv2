import { and, eq } from "drizzle-orm";
import { billingCustomers, subscriptions } from "@lojaveiculosv2/db";
import type { billingPlanHires, payments } from "@lojaveiculosv2/db";
import type { UpsertBillingProviderPaymentInput } from "../../../domains/billing/ports/billingWebhookRepository.js";
import { providerIdentityCanBind } from "./drizzleBillingProviderIdentity.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export function paymentScopeMatchesHire(
  payment: Pick<
    typeof payments.$inferSelect,
    "storeId" | "subscriptionId" | "tenantId"
  >,
  hire: Pick<
    typeof billingPlanHires.$inferSelect,
    "storeId" | "subscriptionId" | "tenantId"
  >,
) {
  return (
    payment.tenantId === hire.tenantId &&
    payment.storeId === hire.storeId &&
    payment.subscriptionId === hire.subscriptionId
  );
}

export async function providerIdentitiesMatchHire(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  input: UpsertBillingProviderPaymentInput,
  knownPaymentMatch = false,
) {
  if (!hire.subscriptionId) return false;
  const [account] = await db
    .select({
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
        eq(subscriptions.id, hire.subscriptionId),
        eq(subscriptions.tenantId, hire.tenantId),
        eq(subscriptions.storeId, hire.storeId),
      ),
    )
    .limit(1);
  if (!account) return false;

  const checkoutMatches = Boolean(
    input.providerCheckoutId &&
    hire.providerCheckoutId === input.providerCheckoutId,
  );
  if (input.providerCheckoutId && hire.providerCheckoutId && !checkoutMatches) {
    return false;
  }
  const knownSubscriptionIds = [
    hire.providerSubscriptionId,
    account.providerSubscriptionId,
  ].filter((value): value is string => Boolean(value));
  if (
    input.providerSubscriptionId &&
    knownSubscriptionIds.some((value) => value !== input.providerSubscriptionId)
  ) {
    return false;
  }
  if (!providerScopedIdentitiesCanBind(account, input)) {
    return false;
  }
  const subscriptionMatches = Boolean(
    input.providerSubscriptionId &&
    knownSubscriptionIds.includes(input.providerSubscriptionId),
  );
  const customerMatches = Boolean(
    input.providerCustomerId &&
    input.providerCustomerId === account.providerCustomerId,
  );
  return (
    knownPaymentMatch ||
    input.providerEvidenceVerified === true ||
    checkoutMatches ||
    subscriptionMatches ||
    customerMatches
  );
}

export async function providerIdentitiesMatchSubscriptionScope(
  db: DrizzleBillingClient,
  scope: { storeId: string; subscriptionId: string; tenantId: string },
  input: UpsertBillingProviderPaymentInput,
) {
  const [account] = await db
    .select({
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
        eq(subscriptions.id, scope.subscriptionId),
        eq(subscriptions.tenantId, scope.tenantId),
        eq(subscriptions.storeId, scope.storeId),
      ),
    )
    .limit(1);
  return Boolean(account && providerScopedIdentitiesCanBind(account, input));
}

export async function findProviderSubscriptionScope(
  db: DrizzleBillingClient,
  input: UpsertBillingProviderPaymentInput,
) {
  if (!input.providerSubscriptionId) return null;
  const [subscription] = await db
    .select({
      id: subscriptions.id,
      providerCustomerId: billingCustomers.providerCustomerId,
      providerSubscriptionId: subscriptions.providerSubscriptionId,
      storeId: subscriptions.storeId,
      tenantId: subscriptions.tenantId,
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
        eq(subscriptions.provider, input.provider),
        eq(subscriptions.providerSubscriptionId, input.providerSubscriptionId),
      ),
    )
    .limit(1);
  return subscription ?? null;
}

export function providerScopedIdentitiesCanBind(
  current: {
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
  },
  incoming: Pick<
    UpsertBillingProviderPaymentInput,
    "providerCustomerId" | "providerSubscriptionId"
  >,
) {
  return (
    providerIdentityCanBind(
      current.providerCustomerId,
      incoming.providerCustomerId,
    ) &&
    providerIdentityCanBind(
      current.providerSubscriptionId,
      incoming.providerSubscriptionId,
    )
  );
}
