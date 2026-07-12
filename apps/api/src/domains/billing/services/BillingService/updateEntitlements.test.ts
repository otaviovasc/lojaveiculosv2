import type { AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  AgencyTenantOverview,
  BillingOverview,
  BillingRepository,
  BillingEntitlementStatus,
} from "../../ports/billingRepository.js";
import { createBillingOverview } from "../../readModels/billingOverviewModel.js";
import { updateAgencyStoreEntitlement } from "./updateAgencyStoreEntitlement.js";
import { updateStoreEntitlement } from "./updateStoreEntitlement.js";
import { BillingStoreNotFoundError } from "./serviceSupport.js";

const tenantId = "tenant_1";
const storeId = "store_1";
const otherStoreId = "store_other";

describe("billing entitlement security contracts", () => {
  it("checks billing permission before reading or mutating store billing", async () => {
    const repository = createRepository();

    await expect(
      updateStoreEntitlement(
        createContext({ permissions: [] }),
        { featureKey: "crm", status: "suspended" },
        { billingRepository: repository },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(repository.getOverview).not.toHaveBeenCalled();
    expect(repository.updateStoreEntitlement).not.toHaveBeenCalled();
  });

  it("scopes a store entitlement mutation and records its critical audit diff", async () => {
    const audit = createAudit();
    const repository = createRepository();

    await updateStoreEntitlement(
      createContext({ audit }),
      { featureKey: "crm", reason: "past_due", status: "suspended" },
      { billingRepository: repository },
    );

    expect(repository.updateStoreEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "user_1",
        featureKey: "crm",
        reason: "past_due",
        source: "billing_console",
        status: "suspended",
        storeId,
        tenantId,
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "billing.entitlement.update",
        criticality: "critical",
        storeId,
        tenantId,
      }),
    );
    expect(audit.record.mock.calls[0]?.[0].changes).toContainEqual({
      after: "suspended",
      before: "active",
      path: "status",
    });
  });

  it("rejects a cross-tenant agency target before store reads or mutation", async () => {
    const audit = createAudit();
    const repository = createRepository();

    await expect(
      updateAgencyStoreEntitlement(
        createContext({ audit }),
        {
          featureKey: "crm",
          status: "suspended",
          storeId: otherStoreId as never,
        },
        { billingRepository: repository },
      ),
    ).rejects.toBeInstanceOf(BillingStoreNotFoundError);

    expect(repository.storeExistsInTenant).toHaveBeenCalledWith({
      storeId: otherStoreId,
      tenantId,
    });
    expect(repository.getTenantOverview).not.toHaveBeenCalled();
    expect(repository.getOverview).not.toHaveBeenCalled();
    expect(repository.updateStoreEntitlement).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("does not report success when the critical audit sink rejects", async () => {
    const audit: AuditSink = {
      record: vi.fn(async () => {
        throw new Error("audit unavailable");
      }),
    };

    await expect(
      updateStoreEntitlement(
        createContext({ audit }),
        { featureKey: "crm", status: "suspended" },
        { billingRepository: createRepository() },
      ),
    ).rejects.toThrow("audit unavailable");
  });
});

function createContext(
  options: {
    audit?: AuditSink;
    permissions?: ServiceContext["permissions"];
  } = {},
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: options.audit ?? createAudit(),
    permissions: options.permissions ?? ["billing.manage"],
    request: { requestId: "request_1" },
    source: { component: "test", service: "api" },
    storeId,
    tenantId,
  });
}

function createAudit() {
  const record = vi.fn<AuditSink["record"]>(async () => undefined);
  return { record };
}

function createRepository(): BillingRepository {
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
    getOverview,
    getTenantOverview,
    storeExistsInTenant,
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
    allocations: [],
    authority: overview.authority,
    chargePreview: overview.chargePreview,
    entitlementEvents: overview.entitlementEvents,
    financialSummary: overview.financialSummary,
    plans: [],
    stores: [
      {
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
  };
}
