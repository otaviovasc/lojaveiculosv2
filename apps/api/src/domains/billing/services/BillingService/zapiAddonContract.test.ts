import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingRepository } from "../../ports/billingRepository.js";
import type { BillingProviderRepository } from "../../ports/billingProviderRepository.js";
import {
  createChargePreview,
  createChargeableItem,
} from "../../readModels/billingChargePreviewModel.js";
import { createBillingOverview } from "../../readModels/billingOverviewModel.js";
import { requestZapiAddon } from "./zapiAddonContract.js";

describe("requestZapiAddon", () => {
  it("schedules R$100 at the existing renewal without rewriting pending charges", async () => {
    const syncSubscription = vi.fn(async () => ({
      created: false,
      currentPeriodEnd: renewal,
      provider: "asaas" as const,
      providerSubscriptionId: "sub_asaas",
      status: "ACTIVE" as const,
    }));
    const repository = createRepository();

    const contract = await requestZapiAddon(
      ownerContext(),
      {},
      {
        billingProviderRepository: providerRepository,
        billingRepository: repository,
        paymentProviderGateway: {
          getProviderStatus: vi.fn(),
          syncCustomer: vi.fn(async () => ({
            created: false,
            provider: "asaas" as const,
            providerCustomerId: "cus_asaas",
          })),
          syncSubscription,
        },
      },
    );

    expect(contract.status).toBe("scheduled");
    expect(syncSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        existingProviderSubscriptionId: "sub_asaas",
        nextDueDate: "2026-09-10",
        updatePendingPayments: false,
        valueCents: 27900,
      }),
    );
    expect(repository.activateSubscriptionSelection).toHaveBeenCalledTimes(1);
    expect(repository.markZapiAddonScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRenewalAmountCents: 27900 }),
    );
  });

  it("rejects actors without billing authority", async () => {
    await expect(
      requestZapiAddon(
        { ...ownerContext(), permissions: [] },
        {},
        { billingRepository: createRepository() },
      ),
    ).rejects.toThrow("Missing permission: billing.manage");
  });

  it("rejects an agency request for a store outside its tenant", async () => {
    const repository = createRepository();
    repository.storeExistsInTenant = vi.fn(async () => false);
    await expect(
      requestZapiAddon(
        { ...ownerContext(), billingManagedBy: "agency", storeId: null },
        { storeId: "outside_store" as never },
        { billingRepository: repository },
      ),
    ).rejects.toThrow("Managed store was not found.");
  });
});

const renewal = new Date("2026-09-10T00:00:00.000Z");

function ownerContext() {
  return createServiceContext({
    actor: { id: "owner_1", kind: "user" },
    billingManagedBy: "store_owner",
    permissions: ["billing.manage"],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

function createRepository(): BillingRepository {
  const contract = {
    addonCode: "crm_zapi",
    cancellationScheduledFor: null,
    id: "contract_1",
    monthlyPriceCents: 10000,
    paidAt: null,
    scheduledFor: renewal,
    setupCompletedAt: null,
    setupConnectionId: null,
    status: "pending" as const,
    storeId: "store_1" as never,
    supportCode: "ZAPI-ABC123DEF456",
  };
  const overview = createBillingOverview({
    addons: [
      {
        catalogVersion: "2026-08-v1",
        code: "crm_core",
        featureKey: "crm",
        id: "addon_crm_core",
        includedInTrial: false,
        monthlyPriceCents: 17900,
        name: "CRM",
        status: "active",
      },
      {
        catalogVersion: "2026-08-v1",
        code: "crm_zapi",
        featureKey: "crm_zapi",
        id: "addon_crm_zapi",
        includedInTrial: false,
        monthlyPriceCents: 10000,
        name: "Z-API",
        status: "active",
      },
    ],
    entitlements: [
      {
        endsAt: null,
        featureKey: "crm",
        metadata: {},
        source: "billing_catalog",
        startsAt: null,
        status: "active",
      },
    ],
    plans: [],
    storeId: "store_1" as never,
    subscription: {
      currentPeriodEnd: renewal,
      currentPeriodStart: new Date("2026-08-10T00:00:00.000Z"),
      id: "subscription_1",
      plan: null,
      status: "active",
    },
    tenantId: "tenant_1" as never,
  });
  return {
    activateSubscriptionSelection: vi.fn(async () => undefined),
    cancelZapiAddon: vi.fn(async () => contract),
    confirmZapiAddonCancellationSync: vi.fn(async () => contract),
    completeZapiAddonSetup: vi.fn(async () => contract),
    getOverview: vi.fn(async () => overview),
    getTenantOverview: vi.fn(),
    markZapiAddonScheduled: vi.fn(async () => ({
      ...contract,
      status: "scheduled" as const,
    })),
    requestZapiAddon: vi.fn(async () => contract),
    storeExistsInTenant: vi.fn(async () => true),
    updateStoreEntitlement: vi.fn(),
    updateSubscriptionSelection: vi.fn(),
  };
}

const providerRepository: BillingProviderRepository = {
  async getProviderAccount() {
    return {
      billingCustomer: {
        documentNumber: "11222333000181",
        email: "billing@example.test",
        id: "customer_1",
        name: "Loja Teste",
        provider: "asaas",
        providerCustomerId: "cus_asaas",
      },
      chargePreview: createChargePreview({
        chargeables: [
          createChargeableItem({
            id: "crm_core_item",
            itemType: "addon",
            label: "CRM",
            quantity: 1,
            startsAt: new Date("2026-08-10T00:00:00.000Z"),
            unitAmountCents: 17900,
          }),
          createChargeableItem({
            id: "crm_zapi_item",
            itemType: "addon",
            label: "Z-API",
            quantity: 1,
            startsAt: renewal,
            unitAmountCents: 10000,
          }),
        ],
      }),
      subscription: {
        currentPeriodEnd: renewal,
        currentPeriodStart: new Date("2026-08-10T00:00:00.000Z"),
        id: "subscription_1",
        provider: "asaas",
        providerSubscriptionId: "sub_asaas",
        status: "active",
      },
    };
  },
  async saveProviderCheckout() {
    return null;
  },
  async saveProviderCustomer() {
    return null;
  },
  async saveProviderSubscription() {
    return null;
  },
};
