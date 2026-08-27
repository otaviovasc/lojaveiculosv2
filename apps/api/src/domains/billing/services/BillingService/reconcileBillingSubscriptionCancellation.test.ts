import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingProviderReconciliationRepository } from "../../ports/billingProviderReconciliation.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import { createUnusedBillingRepository } from "../../testSupportBillingRepository.js";
import { reconcileNextBillingProvider } from "./reconcileBillingProvider.js";

describe("subscription cancellation reconciliation", () => {
  it("cancels recurrence even while paid items remain effective", async () => {
    const fixture = createFixture("sub_asaas");
    const result = await reconcileNextBillingProvider(
      workerContext(),
      { now, processingToken: "claim_1" },
      fixture.ports,
    );

    expect(result.status).toBe("succeeded");
    expect(fixture.cancelSubscription).toHaveBeenCalledWith("sub_asaas");
    expect(fixture.repository.markSucceeded).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelledProviderSubscriptionId: "sub_asaas",
        processingToken: "claim_1",
      }),
    );
  });

  it("completes an already deleted recurrence without another call", async () => {
    const fixture = createFixture(null);
    const result = await reconcileNextBillingProvider(
      workerContext(),
      { now, processingToken: "claim_1" },
      fixture.ports,
    );

    expect(result.status).toBe("succeeded");
    expect(fixture.cancelSubscription).not.toHaveBeenCalled();
    expect(fixture.repository.markSucceeded).toHaveBeenCalledOnce();
  });

  it("keeps a failed cancellation retryable", async () => {
    const fixture = createFixture("sub_asaas");
    fixture.cancelSubscription.mockRejectedValueOnce(
      new Error("Asaas unavailable"),
    );
    const result = await reconcileNextBillingProvider(
      workerContext(),
      { now, processingToken: "claim_1" },
      fixture.ports,
    );

    expect(result.status).toBe("retry");
    expect(fixture.repository.markSucceeded).not.toHaveBeenCalled();
    expect(fixture.repository.markRetry).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: "Asaas unavailable" }),
    );
  });
});

const now = new Date("2026-08-20T12:00:00.000Z");

function createFixture(targetProviderSubscriptionId: string | null) {
  const task = {
    attemptCount: 1,
    id: "reconciliation_1",
    kind: "subscription_cancellation" as const,
    nextDueAt: new Date("2026-09-10T18:00:00.000Z"),
    processingToken: "claim_1",
    targetProviderSubscriptionId,
    storeId: "store_1" as never,
    subscriptionId: "subscription_1",
    tenantId: "tenant_1" as never,
  };
  const repository: BillingProviderReconciliationRepository = {
    claimNext: vi.fn(async () => task),
    markRetry: vi.fn(async () => true),
    markSucceeded: vi.fn(async () => true),
  };
  const cancelSubscription = vi.fn(async () => undefined);
  const gateway: PaymentProviderGateway = {
    cancelSubscription,
    getProviderStatus: vi.fn(),
  };
  const billingProviderRepository: BillingProviderRepository = {
    getProviderAccount: vi.fn(async () => null),
    saveProviderCustomer: vi.fn(async () => null),
    saveProviderSubscription: vi.fn(async () => null),
  };
  return {
    cancelSubscription,
    ports: {
      billingProviderReconciliationRepository: repository,
      billingProviderRepository,
      billingRepository: createUnusedBillingRepository(),
      paymentProviderGateway: gateway,
    },
    repository,
  };
}

function workerContext() {
  return createServiceContext({
    actor: { id: "billing_reconciliation", kind: "system" },
    audit: { record: vi.fn(async () => undefined) },
    permissions: ["billing.manage"],
    request: { requestId: "request_1" },
  });
}
