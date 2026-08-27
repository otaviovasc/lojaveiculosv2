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

describe("createBillingPlanHire paid renewal", () => {
  it("reuses an existing subscription after revoking a queued cancellation", async () => {
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
    repository.supersedeFreeDowngrade = vi.fn(async () => ({
      state: "revoked" as const,
      targetProviderSubscriptionId: "sub_real",
    }));
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
    expect(repository.supersedeFreeDowngrade).toHaveBeenCalledOnce();
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

  it("creates a new recurrence after confirmed subscription deletion", async () => {
    const hire = createHire();
    const order: string[] = [];
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
        providerSubscriptionId: null,
      },
    });
    repository.supersedeFreeDowngrade = vi.fn(async () => {
      order.push("cancel-intent");
      return {
        state: "revoked" as const,
        targetProviderSubscriptionId: "sub_deleted",
      };
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
    >(async () => {
      order.push("provider");
      return {
        created: true,
        currentPeriodEnd: new Date("2026-09-25T00:00:00.000Z"),
        provider: "asaas",
        providerSubscriptionId: "sub_recreated",
        status: "ACTIVE",
      };
    });

    const result = await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      {
        billingPlanHireRepository: repository,
        billingRepository: {} as never,
        paymentProviderGateway: {
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

    expect(order).toEqual(["cancel-intent", "provider"]);
    expect(syncSubscription.mock.calls[0]?.[0]).not.toHaveProperty(
      "existingProviderSubscriptionId",
    );
    expect(result).toMatchObject({
      providerSubscriptionId: "sub_recreated",
      status: "payment_pending",
    });
  });
});
