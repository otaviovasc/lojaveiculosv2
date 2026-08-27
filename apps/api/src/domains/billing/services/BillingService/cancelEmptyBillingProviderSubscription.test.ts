import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import { createChargePreview } from "../../readModels/billingChargePreviewModel.js";
import { cancelEmptyBillingProviderSubscription } from "./cancelEmptyBillingProviderSubscription.js";

describe("cancelEmptyBillingProviderSubscription", () => {
  it("cancels without a provider customer and clears the deleted recurrence id", async () => {
    const cancelSubscription = vi.fn(async () => undefined);
    const saveProviderSubscription = vi.fn<
      BillingProviderRepository["saveProviderSubscription"]
    >(async (input) => ({
      currentPeriodEnd: input.currentPeriodEnd,
      currentPeriodStart: input.currentPeriodStart,
      id: input.subscriptionId,
      provider: input.provider,
      providerSubscriptionId: input.providerSubscriptionId,
      status: input.status,
    }));
    const context = createServiceContext({
      actor: { id: "worker", kind: "system" },
      audit: { record: vi.fn(async () => undefined) },
      permissions: ["billing.manage"],
      request: { requestId: "request_1" },
      source: { component: "test", service: "api" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    const result = await cancelEmptyBillingProviderSubscription(
      context,
      {
        billingCustomer: {
          documentNumber: null,
          email: null,
          id: "customer_1",
          name: "Test",
          provider: "asaas",
          providerCustomerId: null,
        },
        chargePreview: createChargePreview({ chargeables: [] }),
        subscription: {
          currentPeriodEnd: null,
          currentPeriodStart: new Date("2026-08-25T00:00:00.000Z"),
          id: "subscription_1",
          provider: "asaas",
          providerSubscriptionId: "sub_real",
          status: "active",
        },
      },
      "PIX",
      "2026-09-25",
      {
        getProviderAccount: vi.fn(),
        saveProviderCustomer: vi.fn(),
        saveProviderSubscription,
      } satisfies BillingProviderRepository,
      {
        cancelSubscription,
        getProviderStatus: vi.fn(async () => ({
          configured: true,
          missingConfiguration: [],
          provider: "asaas" as const,
          webhookConfigured: true,
        })),
      },
    );

    expect(cancelSubscription).toHaveBeenCalledWith("sub_real");
    expect(saveProviderSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        providerSubscriptionId: null,
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    );
    expect(result.providerCustomerId).toBeNull();
    expect(result.providerSubscriptionId).toBeNull();
  });

  it("does not audit success when provider deletion succeeds but the local CAS misses", async () => {
    const cancelSubscription = vi.fn(async () => undefined);
    const record = vi.fn(async () => undefined);
    const context = createServiceContext({
      actor: { id: "worker", kind: "system" },
      audit: { record },
      permissions: ["billing.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      cancelEmptyBillingProviderSubscription(
        context,
        emptyProviderAccount(),
        "PIX",
        "2026-09-25",
        {
          getProviderAccount: vi.fn(),
          saveProviderCustomer: vi.fn(),
          saveProviderSubscription: vi.fn(async () => null),
        },
        {
          cancelSubscription,
          getProviderStatus: vi.fn(async () => ({
            configured: true,
            missingConfiguration: [],
            provider: "asaas" as const,
            webhookConfigured: true,
          })),
        },
      ),
    ).rejects.toMatchObject({
      reason: "provider_subscription_cancellation_reconciliation_required",
      status: 409,
    });
    expect(cancelSubscription).toHaveBeenCalledWith("sub_real");
    expect(record).not.toHaveBeenCalled();
  });
});

function emptyProviderAccount() {
  return {
    billingCustomer: {
      documentNumber: null,
      email: null,
      id: "customer_1",
      name: "Test",
      provider: "asaas" as const,
      providerCustomerId: null,
    },
    chargePreview: createChargePreview({ chargeables: [] }),
    subscription: {
      currentPeriodEnd: null,
      currentPeriodStart: new Date("2026-08-25T00:00:00.000Z"),
      id: "subscription_1",
      provider: "asaas" as const,
      providerSubscriptionId: "sub_real",
      status: "active" as const,
    },
  };
}
