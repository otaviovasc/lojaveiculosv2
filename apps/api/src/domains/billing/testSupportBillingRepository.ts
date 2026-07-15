import { vi } from "vitest";
import type { BillingRepository } from "./ports/billingRepository.js";

export function createUnusedBillingRepository(): BillingRepository {
  const unused = async () => {
    throw new Error("Unused billing repository.");
  };
  return {
    activateSubscriptionSelection: vi.fn(async () => undefined),
    getOverview: unused,
    getTenantOverview: unused,
    storeExistsInTenant: unused,
    updateSubscriptionSelection: unused,
    updateStoreEntitlement: unused,
  };
}
