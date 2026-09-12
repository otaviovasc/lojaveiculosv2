import type {
  BillingProviderAccount,
  BillingProviderCustomerRecord,
  BillingProviderRepository,
  BillingProviderSubscriptionRecord,
} from "../../../../domains/billing/ports/billingProviderRepository.js";
import { getBillingProviderOverview } from "../../../../domains/billing/readModels/getBillingProviderOverview.js";
import { createMemoryBillingRepository } from "./billingRepository.js";

export function createMemoryBillingProviderRepository(): BillingProviderRepository {
  const billingRepository = createMemoryBillingRepository();
  let billingCustomer: BillingProviderCustomerRecord = {
    documentNumber: "11222333000181",
    email: "billing-test@lojaveiculos.com.br",
    id: "billing_customer_memory",
    name: "Loja Teste LTDA",
    provider: "asaas",
    providerCustomerId: null,
  };
  let subscription: BillingProviderSubscriptionRecord = {
    currentPeriodEnd: null,
    currentPeriodStart: null,
    id: "subscription_memory",
    provider: "asaas",
    providerSubscriptionId: null,
    status: "active",
  };
  let accountScope: { storeId: string; tenantId: string } | null = null;

  return {
    async getProviderAccount(input): Promise<BillingProviderAccount> {
      if (input.storeId) {
        accountScope = { storeId: input.storeId, tenantId: input.tenantId };
      }
      const overview = await getBillingProviderOverview(
        billingRepository,
        input,
      );
      return {
        billingCustomer,
        chargePreview: overview.chargePreview,
        subscription,
      };
    },
    async saveProviderCustomer(input) {
      if (
        input.billingCustomerId !== billingCustomer.id ||
        !scopeMatches(accountScope, input)
      ) {
        return null;
      }
      if (
        billingCustomer.providerCustomerId &&
        billingCustomer.providerCustomerId !== input.providerCustomerId
      ) {
        return null;
      }
      billingCustomer = {
        ...billingCustomer,
        provider: input.provider,
        providerCustomerId: input.providerCustomerId,
      };
      return billingCustomer;
    },
    async saveProviderSubscription(input) {
      if (
        input.subscriptionId !== subscription.id ||
        !scopeMatches(accountScope, input)
      ) {
        return null;
      }
      if (
        input.expectedStatus &&
        input.expectedStatus !== subscription.status
      ) {
        return null;
      }
      const identityCanChange = input.providerSubscriptionId
        ? !subscription.providerSubscriptionId ||
          subscription.providerSubscriptionId === input.providerSubscriptionId
        : input.expectedProviderSubscriptionId
          ? subscription.providerSubscriptionId ===
            input.expectedProviderSubscriptionId
          : !subscription.providerSubscriptionId;
      if (!identityCanChange) return null;
      subscription = {
        currentPeriodEnd: input.currentPeriodEnd,
        currentPeriodStart: input.currentPeriodStart,
        id: input.subscriptionId,
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
      };
      return subscription;
    },
  };
}

function scopeMatches(
  expected: { storeId: string; tenantId: string } | null,
  actual: { storeId: string; tenantId: string },
) {
  return (
    expected?.storeId === actual.storeId &&
    expected.tenantId === actual.tenantId
  );
}
