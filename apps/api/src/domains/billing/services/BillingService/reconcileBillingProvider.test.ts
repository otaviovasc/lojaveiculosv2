import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingProviderReconciliationRepository } from "../../ports/billingProviderReconciliation.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import type { PaymentProviderGateway } from "../../ports/paymentProviderGateway.js";
import {
  createChargePreview,
  createChargeableItem,
} from "../../readModels/billingChargePreviewModel.js";
import { createUnusedBillingRepository } from "../../testSupportBillingRepository.js";
import { reconcileNextBillingProvider } from "./reconcileBillingProvider.js";

describe("reconcileNextBillingProvider", () => {
  it("reconciles a migrated catalog and recalculates pending payments", async () => {
    const fixture = createFixture("catalog_migration", [17900, 10000, 5000]);
    const result = await reconcileNextBillingProvider(
      workerContext(),
      { now, processingToken: "claim_1" },
      fixture.ports,
    );

    expect(result.status).toBe("succeeded");
    expect(fixture.syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        nextDueDate: "2026-09-10",
        updatePendingPayments: true,
        valueCents: 32900,
      }),
    );
    expect(fixture.repository.markSucceeded).toHaveBeenCalledOnce();
  });

  it("keeps a Z-API retirement queued when Asaas does not acknowledge it", async () => {
    const fixture = createFixture("zapi_retirement", [17900]);
    fixture.syncSubscription.mockRejectedValueOnce(
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

  it("recalculates pending renewal payments after Z-API retirement", async () => {
    const fixture = createFixture("zapi_retirement", [17900]);
    await reconcileNextBillingProvider(
      workerContext(),
      { now, processingToken: "claim_1" },
      fixture.ports,
    );

    expect(fixture.syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        nextDueDate: "2026-09-10",
        updatePendingPayments: true,
        valueCents: 17900,
      }),
    );
    expect(fixture.repository.markSucceeded).toHaveBeenCalledOnce();
  });

  it("cancels the provider recurrence while keeping the local Free contract active", async () => {
    const fixture = createFixture("catalog_migration", []);

    const result = await reconcileNextBillingProvider(
      workerContext(),
      { now, processingToken: "claim_1" },
      fixture.ports,
    );

    expect(result.status).toBe("succeeded");
    expect(fixture.cancelSubscription).toHaveBeenCalledWith("sub_asaas");
    expect(fixture.syncSubscription).not.toHaveBeenCalled();
    expect(
      fixture.billingProviderRepository.saveProviderSubscription,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPeriodEnd: null,
        status: "active",
      }),
    );
  });

  it("retries reconciliation when provider deletion succeeds but local identity CAS misses", async () => {
    const fixture = createFixture("catalog_migration", []);
    fixture.billingProviderRepository.saveProviderSubscription = vi.fn(
      async () => null,
    );

    const result = await reconcileNextBillingProvider(
      workerContext(),
      { now, processingToken: "claim_1" },
      fixture.ports,
    );

    expect(result.status).toBe("retry");
    expect(fixture.repository.markSucceeded).not.toHaveBeenCalled();
    const retryInput = vi.mocked(fixture.repository.markRetry).mock
      .calls[0]?.[0];
    expect(retryInput?.errorMessage).toContain("requires reconciliation");
  });
});

const now = new Date("2026-08-20T12:00:00.000Z");
const nextDueAt = new Date("2026-09-10T18:00:00.000Z");

function createFixture(
  kind: "catalog_migration" | "zapi_retirement",
  amounts: readonly number[],
) {
  const task = {
    attemptCount: 1,
    id: "reconciliation_1",
    kind,
    nextDueAt,
    processingToken: "claim_1",
    targetProviderSubscriptionId: "sub_asaas",
    storeId: "store_1" as never,
    subscriptionId: "subscription_1",
    tenantId: "tenant_1" as never,
  };
  const repository: BillingProviderReconciliationRepository = {
    claimNext: vi.fn(async () => task),
    markRetry: vi.fn(async () => true),
    markSucceeded: vi.fn(async () => true),
  };
  const billingProviderRepository = providerRepository(amounts);
  const syncSubscription = vi.fn(async () => ({
    created: false,
    currentPeriodEnd: nextDueAt,
    provider: "asaas" as const,
    providerSubscriptionId: "sub_asaas",
    status: "ACTIVE" as const,
  }));
  const cancelSubscription = vi.fn(async () => undefined);
  const gateway: PaymentProviderGateway = {
    cancelSubscription,
    getProviderStatus: vi.fn(),
    syncCustomer: vi.fn(async () => ({
      created: false,
      provider: "asaas" as const,
      providerCustomerId: "cus_asaas",
    })),
    syncSubscription,
  };
  return {
    billingProviderRepository,
    cancelSubscription,
    ports: {
      billingProviderReconciliationRepository: repository,
      billingProviderRepository,
      billingRepository: createUnusedBillingRepository(),
      paymentProviderGateway: gateway,
    },
    repository,
    syncSubscription,
  };
}

function providerRepository(
  amounts: readonly number[],
): BillingProviderRepository {
  return {
    async getProviderAccount() {
      return {
        billingCustomer: {
          documentNumber: null,
          email: null,
          id: "customer_1",
          name: "Tenant",
          provider: "asaas",
          providerCustomerId: "cus_asaas",
        },
        chargePreview: createChargePreview({
          chargeables: amounts.map((amount, index) =>
            createChargeableItem({
              id: `item_${index}`,
              itemType: "addon",
              label: `Item ${index}`,
              quantity: 1,
              storeId: `store_${index}` as never,
              storeName: `Store ${index}`,
              unitAmountCents: amount,
            }),
          ),
        }),
        subscription: {
          currentPeriodEnd: nextDueAt,
          currentPeriodStart: new Date("2026-08-10T00:00:00.000Z"),
          id: "subscription_1",
          provider: "asaas",
          providerSubscriptionId: "sub_asaas",
          status: "active",
        },
      };
    },
    saveProviderCustomer: vi.fn<
      BillingProviderRepository["saveProviderCustomer"]
    >(async (input) => ({
      documentNumber: null,
      email: null,
      id: input.billingCustomerId,
      name: "Tenant",
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
    })),
    saveProviderSubscription: vi.fn(
      async (
        input: Parameters<
          BillingProviderRepository["saveProviderSubscription"]
        >[0],
      ) => ({
        currentPeriodEnd: input.currentPeriodEnd,
        currentPeriodStart: input.currentPeriodStart,
        id: input.subscriptionId,
        provider: input.provider,
        providerSubscriptionId: input.providerSubscriptionId,
        status: input.status,
      }),
    ),
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
