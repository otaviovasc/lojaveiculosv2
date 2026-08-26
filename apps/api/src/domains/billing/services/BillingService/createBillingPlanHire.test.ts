import { describe, expect, it, vi } from "vitest";
import type { BillingPlanHireRepository } from "../../ports/billingPlanHireRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import { createBillingPlanHire } from "./createBillingPlanHire.js";
import {
  context,
  createHire,
  createRepository,
  readyProvider,
} from "./createBillingPlanHire.testSupport.js";

describe("createBillingPlanHire", () => {
  it("persists the hire before checkout and uses its id as external reference", async () => {
    const order: string[] = [];
    const hire = createHire();
    const repository = createRepository(hire, order);
    const createCheckout = vi.fn<
      NonNullable<PaymentProviderGateway["createCheckout"]>
    >(async (input) => {
      order.push("provider");
      expect(input.externalReference).toBe(hire.id);
      expect(input.callback.successUrl).toContain(`hireId=${hire.id}`);
      return {
        checkoutUrl: "https://sandbox.asaas.test/checkout/chk_1",
        expiresAt: new Date("2026-08-25T15:00:00.000Z"),
        externalReference: hire.id,
        provider: "asaas",
        providerCheckoutId: "chk_1",
        raw: { id: "chk_1" },
      };
    });

    const result = await createBillingPlanHire(
      context(),
      {
        idempotencyKey: "hire-attempt-0001",
        planId: hire.planId,
      },
      {
        billingPlanHireRepository: repository,
        billingRepository: {} as never,
        paymentProviderGateway: {
          createCheckout,
          async getProviderStatus() {
            return {
              configured: true,
              missingConfiguration: [],
              provider: "asaas",
              webhookConfigured: true,
            };
          },
        },
        publicAppUrl: "https://app.lojaveiculos.test",
      },
    );

    expect(order).toEqual(["persist", "provider", "bind"]);
    expect(result).toMatchObject({
      checkoutUrl: "https://sandbox.asaas.test/checkout/chk_1",
      providerCheckoutId: "chk_1",
      status: "checkout_created",
    });
  });

  it("does not call the provider when an idempotent hire already exists", async () => {
    const hire = { ...createHire(), status: "checkout_created" as const };
    const createCheckout = vi.fn();
    const repository = createRepository(hire, [], false);

    await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      {
        billingPlanHireRepository: repository,
        billingRepository: {} as never,
        paymentProviderGateway: {
          createCheckout,
          async getProviderStatus() {
            return {
              configured: true,
              missingConfiguration: [],
              provider: "asaas",
              webhookConfigured: true,
            };
          },
        },
        publicAppUrl: "https://app.lojaveiculos.test",
      },
    );

    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("updates an existing paid subscription for the renewal boundary", async () => {
    const hire = createHire();
    const repository = createRepository(hire, []);
    repository.prepareHire = async () => ({
      billingTypes: ["CREDIT_CARD"],
      created: true,
      customerData: {
        cpfCnpj: "12345678000190",
        email: "billing@example.com",
        name: "Loja Teste",
        phone: null,
      },
      hire,
      providerTransition: {
        effectiveAt: new Date("2026-09-25T00:00:00.000Z"),
        providerCustomerId: "cus_real",
        providerSubscriptionId: "sub_real",
      },
    });
    repository.bindRenewal = vi.fn<BillingPlanHireRepository["bindRenewal"]>(
      async (input) => ({
        ...hire,
        phase: "payment_pending" as const,
        providerSubscriptionId: input.providerSubscriptionId,
        status: "payment_pending" as const,
      }),
    );
    const syncSubscription = vi.fn<
      NonNullable<PaymentProviderGateway["syncSubscription"]>
    >(async () => ({
      created: false,
      currentPeriodEnd: new Date("2026-09-25T00:00:00.000Z"),
      provider: "asaas",
      providerSubscriptionId: "sub_real",
      status: "ACTIVE",
    }));
    const createCheckout = vi.fn();

    const result = await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      {
        billingPlanHireRepository: repository,
        billingRepository: {} as never,
        paymentProviderGateway: {
          createCheckout,
          async getProviderStatus() {
            return readyProvider();
          },
          async syncCustomer() {
            return {
              created: false,
              provider: "asaas",
              providerCustomerId: "cus_real",
            };
          },
          syncSubscription,
        },
        publicAppUrl: "https://app.lojaveiculos.test",
      },
    );

    expect(createCheckout).not.toHaveBeenCalled();
    expect(syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        existingProviderSubscriptionId: "sub_real",
        externalReference: hire.id,
        nextDueDate: "2026-09-25",
        updatePendingPayments: false,
        valueCents: 19_700,
      }),
    );
    expect(result.status).toBe("payment_pending");
  });

  it("cancels provider recurrence before scheduling a Free downgrade", async () => {
    const hire = {
      ...createHire(),
      checkoutMode: "free" as const,
      planSnapshot: { code: "free", name: "Free", selectionRank: 1 },
      quotedCents: 0,
    };
    const repository = createRepository(hire, []);
    repository.prepareHire = async () => ({
      billingTypes: ["PIX"],
      created: true,
      customerData: null,
      hire,
      providerTransition: {
        effectiveAt: new Date("2026-09-25T00:00:00.000Z"),
        providerCustomerId: "cus_real",
        providerSubscriptionId: "sub_real",
      },
    });
    repository.scheduleFreeDowngrade = vi.fn(async () => ({
      ...hire,
      phase: "downgrade_scheduled" as const,
      status: "downgrade_scheduled" as const,
    }));
    const cancelSubscription = vi.fn(async () => undefined);

    const result = await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      {
        billingPlanHireRepository: repository,
        billingRepository: {} as never,
        paymentProviderGateway: {
          cancelSubscription,
          async getProviderStatus() {
            return readyProvider();
          },
        },
        publicAppUrl: "https://app.lojaveiculos.test",
      },
    );

    expect(cancelSubscription).toHaveBeenCalledWith("sub_real");
    expect(result.status).toBe("downgrade_scheduled");
  });
});
