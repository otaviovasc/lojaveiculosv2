import { vi } from "vitest";
import type { BillingRepository } from "./ports/billingRepository.js";

export function createUnusedBillingRepository(): BillingRepository {
  const unused = async () => {
    throw new Error("Unused billing repository.");
  };
  return {
    activateSubscriptionSelection: vi.fn(async () => undefined),
    cancelZapiAddon: unused,
    confirmZapiAddonCancellationSync: unused,
    completeZapiAddonSetup: unused,
    getOverview: unused,
    getTenantOverview: unused,
    markZapiAddonScheduled: unused,
    requestZapiAddon: unused,
    storeExistsInTenant: unused,
    updateSubscriptionSelection: unused,
    updateStoreEntitlement: unused,
  };
}
