import type { AuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { updateAgencyStoreEntitlement } from "./updateAgencyStoreEntitlement.js";
import { updateStoreEntitlement } from "./updateStoreEntitlement.js";
import { BillingStoreNotFoundError } from "./serviceSupport.js";
import {
  createAudit,
  createContext,
  createRepository,
  otherStoreId,
  storeId,
  tenantId,
} from "../../testSupportUpdateEntitlements.js";

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
      createContext({ audit, billingManagedBy: "agency" }),
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
        createContext({ audit, billingManagedBy: "agency" }),
        { featureKey: "crm", status: "suspended" },
        { billingRepository: createRepository() },
      ),
    ).rejects.toThrow("audit unavailable");
  });

  it("does not let a store owner bypass catalog billing with a direct entitlement update", async () => {
    const repository = createRepository();

    await expect(
      updateStoreEntitlement(
        createContext({ billingManagedBy: "store_owner" }),
        { featureKey: "crm", status: "active" },
        { billingRepository: repository },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(repository.getOverview).not.toHaveBeenCalled();
    expect(repository.updateStoreEntitlement).not.toHaveBeenCalled();
  });
});
