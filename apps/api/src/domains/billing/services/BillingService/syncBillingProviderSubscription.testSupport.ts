import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import {
  createChargePreview,
  createChargeableItem,
} from "../../readModels/billingChargePreviewModel.js";

export function createProviderRepository(totalCents = 54899) {
  let savedCustomer:
    Parameters<BillingProviderRepository["saveProviderCustomer"]>[0] | null =
    null;
  let savedSubscription:
    | Parameters<BillingProviderRepository["saveProviderSubscription"]>[0]
    | null = null;
  const repository: BillingProviderRepository = {
    async getProviderAccount() {
      return {
        billingCustomer: {
          documentNumber: "11222333000181",
          email: "billing-test@lojaveiculos.com.br",
          id: "billing_customer_1",
          name: "Loja Teste LTDA",
          provider: "asaas",
          providerCustomerId: "local_asaas_customer_test",
        },
        chargePreview:
          totalCents > 0
            ? createChargePreview({ chargeables: chargeables })
            : createChargePreview({ chargeables: [] }),
        subscription: {
          currentPeriodEnd: null,
          currentPeriodStart: null,
          id: "subscription_1",
          provider: "asaas",
          providerSubscriptionId: "local_asaas_subscription_test",
          status: "trialing",
        },
      };
    },
    async saveProviderCustomer(input) {
      savedCustomer = input;
      return {
        documentNumber: "11222333000181",
        email: "billing-test@lojaveiculos.com.br",
        id: input.billingCustomerId,
        name: "Loja Teste LTDA",
        provider: input.provider,
        providerCustomerId: input.providerCustomerId,
      };
    },
    async saveProviderSubscription(input) {
      savedSubscription = input;
      return {
        currentPeriodEnd: input.currentPeriodEnd,
        currentPeriodStart: input.currentPeriodStart,
        id: input.subscriptionId,
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
      };
    },
  };
  return {
    repository,
    get savedCustomer() {
      return savedCustomer;
    },
    get savedSubscription() {
      return savedSubscription;
    },
  };
}

const chargeables = [
  createChargeableItem({
    id: "subscription_item_1",
    itemType: "plan",
    label: "Growth",
    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    quantity: 1,
    startsAt: new Date("2026-07-01T00:00:00.000Z"),
    storeId: "store_1" as never,
    storeName: "Loja Teste",
    unitAmountCents: 29900,
  }),
  createChargeableItem({
    id: "subscription_item_2",
    itemType: "addon",
    label: "CRM WhatsApp",
    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    quantity: 1,
    startsAt: new Date("2026-07-01T00:00:00.000Z"),
    storeId: "store_1" as never,
    storeName: "Loja Teste",
    unitAmountCents: 24999,
  }),
];
