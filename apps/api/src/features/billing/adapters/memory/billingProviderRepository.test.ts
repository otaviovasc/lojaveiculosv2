import { describe, expect, it } from "vitest";
import { createMemoryBillingProviderRepository } from "./billingProviderRepository.js";

describe("memory billing provider repository identity binding", () => {
  it("rejects a conflicting provider subscription rebind", async () => {
    const repository = createMemoryBillingProviderRepository();
    const scope = {
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    };
    await repository.getProviderAccount(scope);
    const base = {
      currentPeriodEnd: null,
      currentPeriodStart: null,
      provider: "asaas" as const,
      status: "active" as const,
      subscriptionId: "subscription_memory",
      ...scope,
    };

    await expect(
      repository.saveProviderSubscription({
        ...base,
        providerSubscriptionId: "sub_1",
      }),
    ).resolves.toMatchObject({ providerSubscriptionId: "sub_1" });
    await expect(
      repository.saveProviderSubscription({
        ...base,
        providerSubscriptionId: "sub_2",
      }),
    ).resolves.toBeNull();
    await expect(repository.getProviderAccount(scope)).resolves.toMatchObject({
      subscription: { providerSubscriptionId: "sub_1" },
    });
  });

  it("clears an identity only when the expected provider id matches", async () => {
    const repository = createMemoryBillingProviderRepository();
    const scope = {
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    };
    await repository.getProviderAccount(scope);
    const base = {
      currentPeriodEnd: null,
      currentPeriodStart: null,
      provider: "asaas" as const,
      status: "active" as const,
      subscriptionId: "subscription_memory",
      ...scope,
    };
    await repository.saveProviderSubscription({
      ...base,
      providerSubscriptionId: "sub_1",
    });

    await expect(
      repository.saveProviderSubscription({
        ...base,
        expectedProviderSubscriptionId: "sub_wrong",
        providerSubscriptionId: null,
      }),
    ).resolves.toBeNull();
    await expect(
      repository.saveProviderSubscription({
        ...base,
        expectedProviderSubscriptionId: "sub_1",
        providerSubscriptionId: null,
      }),
    ).resolves.toMatchObject({ providerSubscriptionId: null });
  });
});
