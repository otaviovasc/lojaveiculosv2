import { describe, expect, it, vi } from "vitest";
import { createBillingPlanHire } from "./createBillingPlanHire.js";
import {
  context,
  createHire,
  createRepository,
  readyProvider,
} from "./createBillingPlanHire.testSupport.js";

describe("createBillingPlanHire Free downgrade", () => {
  it("persists the downgrade and leaves provider cancellation to the durable worker", async () => {
    const hire = freeRenewalHire();
    const repository = createRepository(hire, []);
    repository.prepareHire = async () => preparedFreeRenewal(hire, "sub_real");
    repository.scheduleFreeDowngrade = vi.fn(async () => {
      return scheduledHire(hire);
    });
    const cancelSubscription = vi.fn(async () => undefined);

    const result = await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      billingPorts(repository, { cancelSubscription }),
    );

    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(result.status).toBe("downgrade_scheduled");
  });

  it("keeps the downgrade retryable when provider cancellation fails", async () => {
    const hire = freeRenewalHire();
    const repository = freeRenewalRepository(hire);
    const cancelSubscription = vi.fn(async () => {
      throw new Error("Asaas unavailable");
    });

    const result = await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      billingPorts(repository, { cancelSubscription }),
    );

    expect(result.status).toBe("downgrade_scheduled");
    expect(repository.scheduleFreeDowngrade).toHaveBeenCalledOnce();
    expect(repository.failHire).not.toHaveBeenCalled();
  });

  it("returns the scheduled downgrade when inline cancellation is unavailable", async () => {
    const hire = freeRenewalHire();
    const repository = freeRenewalRepository(hire);

    const result = await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      billingPorts(repository, {}),
    );

    expect(result.status).toBe("downgrade_scheduled");
    expect(repository.scheduleFreeDowngrade).toHaveBeenCalledOnce();
    expect(repository.failHire).not.toHaveBeenCalled();
  });

  it("does not fail a persisted downgrade when its critical audit fails", async () => {
    const hire = freeRenewalHire();
    const repository = freeRenewalRepository(hire);
    const auditError = new Error("audit unavailable");
    const record = vi.fn(async () => Promise.reject(auditError));
    const cancelSubscription = vi.fn(async () => undefined);

    await expect(
      createBillingPlanHire(
        { ...context(), audit: { record } },
        { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
        billingPorts(repository, { cancelSubscription }),
      ),
    ).rejects.toBe(auditError);

    expect(repository.scheduleFreeDowngrade).toHaveBeenCalledOnce();
    expect(repository.failHire).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it("keeps the scheduled transition after provider identity is cleared", async () => {
    const hire = freeRenewalHire();
    const repository = freeRenewalRepository(hire);
    repository.prepareHire = async () => preparedFreeRenewal(hire, null);
    const cancelSubscription = vi.fn(async () => undefined);

    const result = await createBillingPlanHire(
      context(),
      { idempotencyKey: hire.idempotencyKey, planId: hire.planId },
      billingPorts(repository, { cancelSubscription }),
    );

    expect(result.status).toBe("downgrade_scheduled");
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});

function freeRenewalHire() {
  return {
    ...createHire(),
    checkoutMode: "free" as const,
    planSnapshot: { code: "free", name: "Free", selectionRank: 1 },
    quotedCents: 0,
  };
}

function preparedFreeRenewal(
  hire: ReturnType<typeof freeRenewalHire>,
  providerSubscriptionId: string | null,
) {
  return {
    billingTypes: ["PIX"] as const,
    created: true,
    customerData: null,
    hire,
    providerTransition: {
      effectiveAt: new Date("2026-09-25T00:00:00.000Z"),
      providerCustomerId: "cus_real",
      providerSubscriptionId,
    },
  };
}

function scheduledHire(hire: ReturnType<typeof freeRenewalHire>) {
  return {
    ...hire,
    phase: "downgrade_scheduled" as const,
    status: "downgrade_scheduled" as const,
  };
}

function freeRenewalRepository(hire: ReturnType<typeof freeRenewalHire>) {
  const repository = createRepository(hire, []);
  repository.prepareHire = async () => preparedFreeRenewal(hire, "sub_real");
  repository.scheduleFreeDowngrade = vi.fn(async () => scheduledHire(hire));
  repository.failHire = vi.fn(async () => undefined);
  return repository;
}

function billingPorts(
  repository: ReturnType<typeof freeRenewalRepository>,
  gateway: { cancelSubscription?: (id: string) => Promise<void> },
) {
  return {
    billingPlanHireRepository: repository,
    billingRepository: {} as never,
    paymentProviderGateway: {
      ...gateway,
      async getProviderStatus() {
        return readyProvider();
      },
    },
    publicAppUrl: "https://app.lojaveiculos.test",
  };
}
