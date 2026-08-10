import type { AuditSink } from "@lojaveiculosv2/audit";
import { vi } from "vitest";
import {
  createServiceContext,
  type ServiceContext,
} from "../../shared/serviceContext.js";
import type {
  AgencyTenantOverview,
  BillingEntitlementStatus,
  BillingOverview,
  BillingRepository,
} from "./ports/billingRepository.js";
import { createBillingOverview } from "./readModels/billingOverviewModel.js";

export const tenantId = "tenant_1";
export const storeId = "store_1";
export const otherStoreId = "store_other";

export function createContext(
  options: {
    audit?: AuditSink;
    billingManagedBy?: ServiceContext["billingManagedBy"];
    permissions?: ServiceContext["permissions"];
  } = {},
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: options.audit ?? createAudit(),
    ...(options.billingManagedBy
      ? { billingManagedBy: options.billingManagedBy }
      : {}),
    permissions: options.permissions ?? ["billing.manage"],
    request: { requestId: "request_1" },
    source: { component: "test", service: "api" },
    storeId,
    tenantId,
  });
}

export function createAudit() {
  const record = vi.fn<AuditSink["record"]>(async () => undefined);
  return { record };
}

export function createRepository(): BillingRepository {
  let status: BillingEntitlementStatus = "active";
  const getOverview = vi.fn<BillingRepository["getOverview"]>(async (input) =>
    createOverview(input.storeId, input.tenantId, status),
  );
  const getTenantOverview = vi.fn<BillingRepository["getTenantOverview"]>(
    async (input) => createTenantOverview(input.tenantId, status),
  );
  const storeExistsInTenant = vi.fn<BillingRepository["storeExistsInTenant"]>(
    async (input) => input.storeId === storeId && input.tenantId === tenantId,
  );
  const update = vi.fn<BillingRepository["updateStoreEntitlement"]>(
    async (input) => {
      status = input.status;
      return createOverview(input.storeId, input.tenantId, status);
    },
  );
  return {
    activateSubscriptionSelection: async () => undefined,
    getOverview,
    getTenantOverview,
    storeExistsInTenant,
    updateSubscriptionSelection: async () => {
      throw new Error("Unused billing repository.");
    },
    updateStoreEntitlement: update,
  };
}

function createOverview(
  targetStoreId: string,
  targetTenantId: string,
  status: BillingEntitlementStatus,
): BillingOverview {
  return createBillingOverview({
    entitlements: [
      {
        endsAt: null,
        featureKey: "crm",
        metadata: {},
        source: status === "active" ? "seed" : "billing_console",
        startsAt: null,
        status,
      },
    ],
    plans: [],
    storeId: targetStoreId as never,
    subscription: null,
    tenantId: targetTenantId as never,
  });
}

function createTenantOverview(
  targetTenantId: string,
  status: BillingEntitlementStatus,
): AgencyTenantOverview {
  const overview = createOverview(storeId, targetTenantId, status);
  return {
    addonContracts: [],
    addons: [],
    allocations: [],
    authority: overview.authority,
    chargePreview: overview.chargePreview,
    entitlementEvents: overview.entitlementEvents,
    financialSummary: overview.financialSummary,
    plans: [],
    stores: [
      {
        addonContracts: [],
        activeEntitlementCount: status === "active" ? 1 : 0,
        addonCount: 0,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        entitlementCount: 1,
        entitlementMatrix: overview.entitlementMatrix,
        monthlyAmountCents: 0,
        planCode: null,
        planName: null,
        storeId: storeId as never,
        storeName: "Managed store",
        storeSlug: "managed-store",
        subscriptionStatus: null,
        vehicleCount: 0,
      },
    ],
    subscription: null,
    tenant: {
      tenantId: targetTenantId as never,
      tenantName: "Agency tenant",
      tenantSlug: "agency-tenant",
    },
    tenantId: targetTenantId as never,
    usageAllowances: [],
  };
}
