import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { BillingRepository } from "../../ports/billingRepository.js";
import { createBillingOverview } from "../../readModels/billingOverviewModel.js";
import {
  BillingSelectionError,
  updateBillingSelection,
} from "./updateBillingSelection.js";

describe("updateBillingSelection", () => {
  it("persists a server-catalog selection and audits the preview", async () => {
    const audit = { record: vi.fn(async () => undefined) };
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      audit,
      billingManagedBy: "store_owner",
      permissions: ["billing.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });
    const billingRepository = createRepository();

    const overview = await updateBillingSelection(
      context,
      { addonIds: ["addon_crm"], planId: "plan_growth" },
      { billingRepository },
    );

    expect(overview.subscription?.status).toBe("trialing");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.subscription.selection.update",
        criticality: "critical",
      }),
    );
  });

  it("rejects add-ons that are absent from the selected catalog", async () => {
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      billingManagedBy: "store_owner",
      permissions: ["billing.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    });

    await expect(
      updateBillingSelection(
        context,
        { addonIds: ["unknown"], planId: "plan_growth" },
        { billingRepository: createRepository() },
      ),
    ).rejects.toBeInstanceOf(BillingSelectionError);
  });
});

function createRepository(): BillingRepository {
  const overview = createBillingOverview({
    addons: [
      {
        catalogVersion: "2026-07-v1",
        code: "crm_whatsapp_instance",
        featureKey: "crm",
        id: "addon_crm",
        includedInTrial: false,
        monthlyPriceCents: 24999,
        name: "CRM WhatsApp",
        status: "active",
      },
    ],
    entitlements: [],
    plans: [
      {
        catalogVersion: "2026-07-v1",
        code: "growth",
        features: [],
        id: "plan_growth",
        limits: { sellerLimit: 8, vehicleLimit: 300 },
        monthlyPriceCents: 29900,
        name: "Growth",
        status: "active",
      },
    ],
    storeId: "store_1" as never,
    subscription: {
      currentPeriodEnd: new Date("2099-08-01T00:00:00.000Z"),
      currentPeriodStart: new Date("2099-07-01T00:00:00.000Z"),
      id: "subscription_1",
      plan: null,
      status: "trialing",
    },
    tenantId: "tenant_1" as never,
  });
  return {
    activateSubscriptionSelection: async () => undefined,
    getOverview: async () => overview,
    getTenantOverview: async () => {
      throw new Error("Unused tenant overview.");
    },
    storeExistsInTenant: async () => true,
    updateStoreEntitlement: async () => overview,
    updateSubscriptionSelection: async () => overview,
  };
}
