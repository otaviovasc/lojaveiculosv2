import { describe, expect, it, vi } from "vitest";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import { createBillingPlanHire } from "./createBillingPlanHire.js";
import {
  context,
  createHire,
  createRepository,
  readyProvider,
} from "./createBillingPlanHire.testSupport.js";

describe("createBillingPlanHire checkout creation", () => {
  it("persists the hire before checkout and uses its id as external reference", async () => {
    const order: string[] = [];
    const hire = createHire();
    const repository = createRepository(hire, order);
    const prepareHire = vi.spyOn(repository, "prepareHire");
    const bindCheckout = vi.spyOn(repository, "bindCheckout");
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
      { idempotencyKey: "hire-attempt-0001", planId: hire.planId },
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
    expect(prepareHire).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: {
          actorId: "user_1",
          actorKind: "user",
          requestId: "request_1",
        },
      }),
    );
    expect(bindCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: {
          actorId: "user_1",
          actorKind: "user",
          requestId: "request_1",
        },
      }),
    );
    expect(result).toMatchObject({
      checkoutUrl: "https://sandbox.asaas.test/checkout/chk_1",
      phase: "payment_pending",
      providerCheckoutId: "chk_1",
      status: "payment_pending",
    });
  });

  it("fails the hire with BILLING_CUSTOMER_DATA_INCOMPLETE before calling the provider", async () => {
    const order: string[] = [];
    const hire = createHire();
    const repository = createRepository(hire, order, true, {
      address: null,
      addressNumber: null,
      cpfCnpj: "12345678000199",
      email: "contato@loja.test",
      name: "Loja",
      phone: null,
      postalCode: null,
      province: null,
    });
    const failHire = vi.spyOn(repository, "failHire");
    const createCheckout =
      vi.fn<NonNullable<PaymentProviderGateway["createCheckout"]>>();

    await expect(
      createBillingPlanHire(
        context(),
        { idempotencyKey: "hire-attempt-0001", planId: hire.planId },
        {
          billingPlanHireRepository: repository,
          billingRepository: {} as never,
          paymentProviderGateway: {
            createCheckout,
            async getProviderStatus() {
              return readyProvider();
            },
          },
          publicAppUrl: "https://app.lojaveiculos.test",
        },
      ),
    ).rejects.toMatchObject({
      code: "BILLING_CUSTOMER_DATA_INCOMPLETE",
      details: {
        missingFields: ["address", "addressNumber", "province", "postalCode"],
      },
      name: "BillingPlanHireError",
    });
    expect(createCheckout).not.toHaveBeenCalled();
    expect(failHire).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCode: "customer_data_incomplete",
        hireId: hire.id,
      }),
    );
  });

  it("fails the hire with BILLING_PROVIDER_CHECKOUT_FAILED when the provider rejects the checkout", async () => {
    const order: string[] = [];
    const hire = createHire();
    const repository = createRepository(hire, order);
    const failHire = vi.spyOn(repository, "failHire");
    const createCheckout = vi.fn<
      NonNullable<PaymentProviderGateway["createCheckout"]>
    >(async () => {
      throw new Error("O campo email deve ser informado.");
    });

    await expect(
      createBillingPlanHire(
        context(),
        { idempotencyKey: "hire-attempt-0001", planId: hire.planId },
        {
          billingPlanHireRepository: repository,
          billingRepository: {} as never,
          paymentProviderGateway: {
            createCheckout,
            async getProviderStatus() {
              return readyProvider();
            },
          },
          publicAppUrl: "https://app.lojaveiculos.test",
        },
      ),
    ).rejects.toMatchObject({
      code: "BILLING_PROVIDER_CHECKOUT_FAILED",
      name: "BillingPlanHireError",
    });
    expect(failHire).toHaveBeenCalledWith(
      expect.objectContaining({
        failureCode: "provider_checkout_failed",
        hireId: hire.id,
      }),
    );
  });
});
