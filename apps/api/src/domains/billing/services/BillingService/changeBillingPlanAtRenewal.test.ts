import { describe, expect, it, vi } from "vitest";
import type { BillingPlanHireRepository } from "../../ports/billingPlanHireRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import { changeBillingPlanAtRenewal } from "./changeBillingPlanAtRenewal.js";
import {
  context,
  createHire,
  createRepository,
  readyProvider,
} from "./createBillingPlanHire.testSupport.js";

describe("changeBillingPlanAtRenewal", () => {
  it("restores cancellation retry when paid re-hire provider sync fails", async () => {
    const hire = createHire();
    const repository = createRepository(hire, []);
    const order: string[] = [];
    repository.supersedeFreeDowngrade = vi.fn(async () => {
      order.push("cancel-intent");
      return {
        state: "revoked" as const,
        targetProviderSubscriptionId: "sub_old",
      };
    });
    repository.restoreFreeDowngradeCancellation = vi.fn(async () => {
      order.push("restore-intent");
    });
    repository.failHire = vi.fn(async () => {
      order.push("fail-hire");
    });
    const providerError = new Error("Asaas unavailable");
    const syncSubscription = vi.fn<
      NonNullable<PaymentProviderGateway["syncSubscription"]>
    >(async () => {
      order.push("provider");
      throw providerError;
    });

    await expect(
      changeBillingPlanAtRenewal(
        context(),
        {
          billingTypes: ["CREDIT_CARD"],
          created: true,
          customerData: {
            address: null,
            addressNumber: null,
            cpfCnpj: "12345678000190",
            email: "billing@example.test",
            name: "Loja Teste",
            phone: null,
            postalCode: null,
            province: null,
          },
          hire,
          providerTransition: {
            effectiveAt: new Date("2026-09-25T00:00:00.000Z"),
            providerCustomerId: "cus_real",
            providerSubscriptionId: "sub_old",
          },
        },
        repository,
        {
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
        {
          storeId: hire.storeId,
          tenantId: hire.tenantId,
        },
      ),
    ).rejects.toBe(providerError);

    expect(order).toEqual([
      "cancel-intent",
      "provider",
      "restore-intent",
      "fail-hire",
    ]);
    expect(repository.restoreFreeDowngradeCancellation).toHaveBeenCalledWith({
      hireId: hire.id,
      providerSubscriptionId: "sub_old",
      storeId: hire.storeId,
      tenantId: hire.tenantId,
    });
  });

  it("fences an in-flight cancellation and creates a distinct recurrence", async () => {
    const hire = createHire();
    const repository = createRepository(hire, []);
    repository.supersedeFreeDowngrade = vi.fn(async () => ({
      state: "in_flight" as const,
      targetProviderSubscriptionId: "sub_old",
    }));
    repository.restoreFreeDowngradeCancellation = vi.fn(async () => undefined);
    const syncSubscription = vi.fn<
      NonNullable<PaymentProviderGateway["syncSubscription"]>
    >(async () => ({
      created: true,
      currentPeriodEnd: new Date("2026-10-25T00:00:00.000Z"),
      provider: "asaas",
      providerSubscriptionId: "sub_new",
      status: "ACTIVE",
    }));
    repository.bindRenewal = vi.fn<BillingPlanHireRepository["bindRenewal"]>(
      async (input) => ({
        ...hire,
        providerSubscriptionId: input.providerSubscriptionId,
      }),
    );

    await changeBillingPlanAtRenewal(
      context(),
      preparedPaidTransition(hire),
      repository,
      {
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
      { storeId: hire.storeId, tenantId: hire.tenantId },
    );

    expect(syncSubscription).toHaveBeenCalledWith(
      expect.not.objectContaining({
        existingProviderSubscriptionId: "sub_old",
      }),
    );
    expect(repository.bindRenewal).toHaveBeenCalledWith(
      expect.objectContaining({ providerSubscriptionId: "sub_new" }),
    );
    expect(repository.restoreFreeDowngradeCancellation).not.toHaveBeenCalled();
  });
});

function preparedPaidTransition(hire: ReturnType<typeof createHire>) {
  return {
    billingTypes: ["CREDIT_CARD" as const],
    created: true,
    customerData: {
      address: null,
      addressNumber: null,
      cpfCnpj: "12345678000190",
      email: "billing@example.test",
      name: "Loja Teste",
      phone: null,
      postalCode: null,
      province: null,
    },
    hire,
    providerTransition: {
      effectiveAt: new Date("2026-09-25T00:00:00.000Z"),
      providerCustomerId: "cus_real",
      providerSubscriptionId: "sub_old",
    },
  };
}
