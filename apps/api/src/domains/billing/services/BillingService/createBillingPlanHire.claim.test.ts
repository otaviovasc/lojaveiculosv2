import { describe, expect, it, vi } from "vitest";
import type { BillingPlanHireRepository } from "../../ports/billingPlanHireRepository.js";
import { createBillingPlanHire } from "./createBillingPlanHire.js";
import {
  completeCustomerData,
  context,
  createHire,
  createRepository,
  readyProvider,
} from "./createBillingPlanHire.testSupport.js";

describe("createBillingPlanHire checkout claim", () => {
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
            return readyProvider();
          },
        },
        publicAppUrl: "https://app.lojaveiculos.test",
      },
    );

    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("resumes an idempotent created hire through a durable checkout claim", async () => {
    const hire = createHire();
    const repository = createRepository(hire, [], false);
    repository.beginCheckoutRequest = vi.fn<
      BillingPlanHireRepository["beginCheckoutRequest"]
    >(async () => ({
      claimed: true,
      hire: {
        ...hire,
        phase: "payment_pending" as const,
        status: "payment_pending" as const,
      },
    }));
    const createCheckout = vi.fn(async () => ({
      checkoutUrl: "https://sandbox.asaas.test/checkout/chk_resumed",
      expiresAt: new Date("2026-08-25T15:00:00.000Z"),
      externalReference: hire.id,
      provider: "asaas" as const,
      providerCheckoutId: "chk_resumed",
      raw: {},
    }));

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
        },
        publicAppUrl: "https://app.lojaveiculos.test",
      },
    );

    expect(repository.beginCheckoutRequest).toHaveBeenCalledOnce();
    expect(createCheckout).toHaveBeenCalledOnce();
    expect(result.providerCheckoutId).toBe("chk_resumed");
  });

  it("does not duplicate provider checkout while another request owns the claim", async () => {
    const hire = {
      ...createHire(),
      phase: "payment_pending" as const,
      status: "payment_pending" as const,
    };
    const repository = createRepository(hire, [], false);
    repository.beginCheckoutRequest = vi.fn(async () => ({
      claimed: false,
      hire,
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
        },
      },
    );

    expect(createCheckout).not.toHaveBeenCalled();
    expect(result.status).toBe("payment_pending");
  });

  it("does not repeat provider IO after an indeterminate binding failure", async () => {
    const createdHire = createHire();
    const pendingHire = {
      ...createdHire,
      phase: "payment_pending" as const,
      status: "payment_pending" as const,
    };
    const repository = createRepository(createdHire, [], false);
    let claimed = false;
    repository.prepareHire = async () => ({
      billingTypes: ["CREDIT_CARD"],
      created: false,
      customerData: completeCustomerData(),
      hire: claimed ? pendingHire : createdHire,
      providerTransition: null,
    });
    repository.beginCheckoutRequest = async () => {
      if (claimed) return { claimed: false, hire: pendingHire };
      claimed = true;
      return { claimed: true, hire: pendingHire };
    };
    repository.bindCheckout = async () => {
      throw new Error("database connection lost after provider response");
    };
    const createCheckout = vi.fn(async () => ({
      checkoutUrl: "https://sandbox.asaas.test/checkout/chk_indeterminate",
      expiresAt: new Date("2026-08-25T15:00:00.000Z"),
      externalReference: createdHire.id,
      provider: "asaas" as const,
      providerCheckoutId: "chk_indeterminate",
      raw: {},
    }));
    const ports = {
      billingPlanHireRepository: repository,
      billingRepository: {} as never,
      paymentProviderGateway: {
        createCheckout,
        async getProviderStatus() {
          return readyProvider();
        },
      },
      publicAppUrl: "https://app.lojaveiculos.test",
    };

    await expect(
      createBillingPlanHire(
        context(),
        {
          idempotencyKey: createdHire.idempotencyKey,
          planId: createdHire.planId,
        },
        ports,
      ),
    ).rejects.toThrow("database connection lost");
    const retry = await createBillingPlanHire(
      context(),
      {
        idempotencyKey: createdHire.idempotencyKey,
        planId: createdHire.planId,
      },
      ports,
    );

    expect(createCheckout).toHaveBeenCalledOnce();
    expect(retry.status).toBe("payment_pending");
  });
});
