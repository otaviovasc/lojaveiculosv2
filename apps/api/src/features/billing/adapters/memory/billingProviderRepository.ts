import type {
  BillingProviderAccount,
  BillingProviderCheckoutRecord,
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
    providerCustomerId: "local_asaas_customer_memory",
  };
  let subscription: BillingProviderSubscriptionRecord = {
    currentPeriodEnd: null,
    currentPeriodStart: null,
    id: "subscription_memory",
    provider: "asaas",
    providerSubscriptionId: "local_asaas_subscription_memory",
    status: "trialing",
  };
  const checkouts: BillingProviderCheckoutRecord[] = [];

  return {
    async getProviderAccount(input): Promise<BillingProviderAccount> {
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
      if (input.billingCustomerId !== billingCustomer.id) return null;
      billingCustomer = {
        ...billingCustomer,
        provider: input.provider,
        providerCustomerId: input.providerCustomerId,
      };
      return billingCustomer;
    },
    async saveProviderCheckout(input) {
      const checkout: BillingProviderCheckoutRecord = {
        checkoutUrl: input.checkoutUrl,
        expiresAt: input.expiresAt,
        externalReference: input.externalReference,
        id: `checkout_${checkouts.length + 1}`,
        provider: input.provider,
        providerCheckoutId: input.providerCheckoutId,
        status: input.status,
        storeId: input.storeId,
        subscriptionId: input.subscriptionId,
        tenantId: input.tenantId,
      };
      checkouts.push(checkout);
      return checkout;
    },
    async saveProviderSubscription(input) {
      if (input.subscriptionId !== subscription.id) return null;
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
