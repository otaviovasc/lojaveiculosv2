import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import type { BillingRepository } from "../../ports/billingRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import {
  createChargePreview,
  createChargeableItem,
} from "../../readModels/billingChargePreviewModel.js";
import { createBillingProviderCheckout } from "./createBillingProviderCheckout.js";

describe("createBillingProviderCheckout", () => {
  it("creates an audited hosted Asaas checkout from charge preview lines", async () => {
    const audit = createAuditSink();
    const providerRepository = createProviderRepository();
    const gateway = createGateway();

    const result = await createBillingProviderCheckout(
      createContext(audit),
      {
        billingTypes: ["CREDIT_CARD", "PIX"],
        minutesToExpire: 90,
        nextDueDate: new Date("2026-07-10T00:00:00.000Z"),
        returnPath: "/billing",
      },
      {
        billingProviderRepository: providerRepository.repository,
        billingRepository: createBillingRepository(),
        paymentProviderGateway: gateway.gateway,
        publicAppUrl: "https://app.lojaveiculos.test",
      },
    );

    expect(gateway.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        billingTypes: ["CREDIT_CARD"],
        callback: {
          cancelUrl: "https://app.lojaveiculos.test/billing?checkout=cancelled",
          expiredUrl: "https://app.lojaveiculos.test/billing?checkout=expired",
          successUrl: "https://app.lojaveiculos.test/billing?checkout=success",
        },
        externalReference: expect.stringContaining(
          "lojaveiculos:subscription:subscription_1:checkout:",
        ),
        items: [
          expect.objectContaining({ name: "Growth", valueCents: 29900 }),
          expect.objectContaining({
            name: "CRM WhatsApp",
            valueCents: 24999,
          }),
        ],
        minutesToExpire: 90,
        nextDueDate: "2026-07-10",
      }),
    );
    expect(gateway.createCheckout).toHaveBeenCalledWith(
      expect.not.objectContaining({ customerData: expect.anything() }),
    );
    expect(providerRepository.savedCheckout).toMatchObject({
      providerCheckoutId: "chk_1",
      status: "created",
      subscriptionId: "subscription_1",
    });
    expect(result).toMatchObject({
      checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show?id=chk_1",
      providerCheckoutId: "chk_1",
      subscriptionId: "subscription_1",
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.provider_checkout.create",
        outcome: "succeeded",
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
  });
});

function createContext(audit: AuditSink) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit,
    permissions: ["billing.manage"],
    request: { requestId: "request_1" },
    source: { component: "test", service: "api" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createAuditSink(): AuditSink {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  return { record };
}

function createGateway() {
  const createCheckout = vi.fn(async () => ({
    checkoutUrl: "https://sandbox.asaas.com/checkoutSession/show?id=chk_1",
    expiresAt: new Date("2026-07-08T13:30:00.000Z"),
    externalReference: "lojaveiculos:subscription:subscription_1:checkout:1",
    provider: "asaas" as const,
    providerCheckoutId: "chk_1",
    raw: { id: "chk_1" },
  }));
  const gateway: PaymentProviderGateway = {
    createCheckout,
    async getProviderStatus() {
      return {
        configured: true,
        missingConfiguration: [],
        provider: "asaas",
        webhookConfigured: true,
      };
    },
  };
  return { createCheckout, gateway };
}

function createProviderRepository() {
  let savedCheckout:
    Parameters<BillingProviderRepository["saveProviderCheckout"]>[0] | null =
    null;
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
        chargePreview: createChargePreview({
          chargeables: [
            createChargeableItem({
              id: "subscription_item_1",
              itemType: "plan",
              label: "Growth",
              quantity: 1,
              storeId: "store_1" as never,
              storeName: "Loja Teste",
              unitAmountCents: 29900,
            }),
            createChargeableItem({
              id: "subscription_item_2",
              itemType: "addon",
              label: "CRM WhatsApp",
              quantity: 1,
              storeId: "store_1" as never,
              storeName: "Loja Teste",
              unitAmountCents: 24999,
            }),
          ],
        }),
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
    async saveProviderCheckout(input) {
      savedCheckout = input;
      return null;
    },
    async saveProviderCustomer() {
      throw new Error("Unused provider customer.");
    },
    async saveProviderSubscription() {
      throw new Error("Unused provider subscription.");
    },
  };
  return {
    repository,
    get savedCheckout() {
      return savedCheckout;
    },
  };
}

function createBillingRepository(): BillingRepository {
  return {
    getOverview: async () => {
      throw new Error("Unused billing repository.");
    },
    getTenantOverview: async () => {
      throw new Error("Unused billing repository.");
    },
    updateStoreEntitlement: async () => {
      throw new Error("Unused billing repository.");
    },
  };
}
