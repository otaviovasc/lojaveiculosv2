import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { BillingRepository } from "../ports/billingRepository.js";
import { getBillingProviderOverview } from "./getBillingProviderOverview.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("getBillingProviderOverview", () => {
  it("loads the store overview with the provider account authority context", async () => {
    const getOverview = vi.fn<BillingRepository["getOverview"]>();
    const getTenantOverview = vi.fn<BillingRepository["getTenantOverview"]>();

    await getBillingProviderOverview(
      { getOverview, getTenantOverview },
      {
        billingManagedBy: "agency",
        currentActorCanManage: false,
        storeId,
        tenantId,
      },
    );

    expect(getOverview).toHaveBeenCalledWith({
      billingManagedBy: "agency",
      currentActorCanManage: false,
      storeId,
      tenantId,
    });
    expect(getTenantOverview).not.toHaveBeenCalled();
  });

  it("loads the tenant overview when the provider account is not store scoped", async () => {
    const getOverview = vi.fn<BillingRepository["getOverview"]>();
    const getTenantOverview = vi.fn<BillingRepository["getTenantOverview"]>();

    await getBillingProviderOverview(
      { getOverview, getTenantOverview },
      {
        currentActorCanManage: false,
        storeId: null,
        tenantId,
      },
    );

    expect(getTenantOverview).toHaveBeenCalledWith({
      currentActorCanManage: false,
      tenantId,
    });
    expect(getOverview).not.toHaveBeenCalled();
  });
});
