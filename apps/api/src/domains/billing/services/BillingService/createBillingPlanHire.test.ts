import { describe, expect, it, vi } from "vitest";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import { createBillingPlanHire } from "./createBillingPlanHire.js";
import {
  context,
  createHire,
  createRepository,
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
});
