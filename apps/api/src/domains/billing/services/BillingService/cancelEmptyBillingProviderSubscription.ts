import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  BillingProviderAccount,
  BillingProviderRepository,
  BillingProviderSubscriptionRecord,
  BillingProviderSubscriptionSyncResult,
} from "../../ports/billingProviderRepository.js";
import type {
  PaymentProviderBillingType,
  PaymentProviderGateway,
} from "../../ports/paymentProviderGateway.js";
import {
  BillingProviderSyncError,
  realProviderId,
} from "../../readModels/billingProviderSyncModel.js";

export async function cancelEmptyBillingProviderSubscription(
  context: ServiceContext,
  account: BillingProviderAccount & {
    subscription: BillingProviderSubscriptionRecord;
  },
  billingType: PaymentProviderBillingType,
  nextDueDate: string,
  repository: BillingProviderRepository,
  gateway: PaymentProviderGateway,
): Promise<BillingProviderSubscriptionSyncResult> {
  const providerSubscriptionId = realProviderId(
    account.subscription.providerSubscriptionId,
  );
  if (!providerSubscriptionId || !gateway.cancelSubscription) {
    throw new BillingProviderSyncError(
      "provider_subscription_cancellation_unavailable",
      "The empty provider recurrence could not be cancelled safely.",
    );
  }
  const providerCustomerId = realProviderId(
    account.billingCustomer.providerCustomerId,
  );
  await gateway.cancelSubscription(providerSubscriptionId);
  await repository.saveProviderSubscription({
    currentPeriodEnd: null,
    currentPeriodStart: account.subscription.currentPeriodStart,
    provider: "asaas",
    providerSubscriptionId: null,
    status: "active",
    subscriptionId: account.subscription.id,
  });
  await context.audit.record({
    action: "billing.provider_subscription.sync",
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: account.subscription.id,
    entityType: "billing_subscription",
    metadata: {
      chargeTotalCents: 0,
      outcome: "succeeded",
      provider: "asaas",
      providerCustomerId,
      providerSubscriptionId,
      reason: "empty_recurrence_cancelled",
      status: "active",
      subscriptionId: account.subscription.id,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Cancelled an empty provider recurrence and preserved Free",
  });
  return {
    billingType,
    chargeTotalCents: 0,
    nextDueDate,
    provider: "asaas",
    providerCustomerId,
    providerSubscriptionId: null,
    status: "active",
    subscriptionId: account.subscription.id,
    synchronizedAt: new Date().toISOString(),
  };
}
