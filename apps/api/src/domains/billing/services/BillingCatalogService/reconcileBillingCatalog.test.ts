import { describe, expect, it, vi } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import {
  BillingCatalogActivationAuditInProgressError,
  BillingCatalogNotPublishedError,
} from "../../catalog/billingCatalogIntegrity.js";
import { currentBillingCatalog } from "../../catalog/currentBillingCatalog.js";
import type { BillingCatalogDeploymentRepository } from "../../ports/billingCatalogDeployment.js";
import {
  BillingCatalogDeploymentAuthorizationError,
  reconcileBillingCatalog,
} from "./reconcileBillingCatalog.js";

describe("reconcileBillingCatalog", () => {
  it("activates and records required audit evidence", async () => {
    const audit = createMemoryAuditSink();
    const repository = createRepository({
      activationAuditBlocked: false,
      activationAuditClaimToken: "catalog_test",
      activationAuditPending: true,
      activated: true,
      checksum: "a".repeat(64),
      previousVersion: "2026-08-v1",
      version: "2026-08-v2",
    });

    const result = await reconcileBillingCatalog(
      createContext(audit),
      { catalog: currentBillingCatalog },
      { catalogDeploymentRepository: repository },
    );

    expect(result.activated).toBe(true);
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      action: "billing.catalog.activated",
      criticality: "critical",
      entityId: "2026-08-v2",
      failureTier: "required",
    });
    expect(audit.events[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(repository.markActivationAudited).toHaveBeenCalledWith({
      claimToken: "catalog_test",
      checksum: "a".repeat(64),
      version: "2026-08-v2",
    });
  });

  it("does not emit duplicate audit for a fully reconciled no-op", async () => {
    const audit = createMemoryAuditSink();
    const repository = createRepository({
      activationAuditBlocked: false,
      activationAuditClaimToken: null,
      activationAuditPending: false,
      activated: false,
      checksum: "a".repeat(64),
      previousVersion: "2026-08-v1",
      version: "2026-08-v2",
    });

    await reconcileBillingCatalog(
      createContext(audit),
      { catalog: currentBillingCatalog },
      { catalogDeploymentRepository: repository },
    );

    expect(audit.events).toHaveLength(0);
    expect(repository.markActivationAudited).not.toHaveBeenCalled();
  });

  it("leaves activation evidence pending when required audit storage fails", async () => {
    const repository = createRepository({
      activationAuditBlocked: false,
      activationAuditClaimToken: "catalog_test_audit_failure",
      activationAuditPending: true,
      activated: true,
      checksum: "a".repeat(64),
      previousVersion: null,
      version: "2026-08-v2",
    });
    const audit = {
      record: vi.fn(async () => {
        throw new Error("audit unavailable");
      }),
    };

    await expect(
      reconcileBillingCatalog(
        createServiceContext({
          actor: { id: "billing_catalog_deploy", kind: "system" },
          audit,
          auditFailureTier: "required",
          permissions: ["billing.catalog.deploy"],
          request: { requestId: "catalog_test_audit_failure" },
        }),
        { catalog: currentBillingCatalog },
        { catalogDeploymentRepository: repository },
      ),
    ).rejects.toThrow("audit unavailable");
    expect(repository.markActivationAudited).not.toHaveBeenCalled();
    expect(repository.releaseActivationAuditClaim).toHaveBeenCalledWith({
      claimToken: "catalog_test_audit_failure",
      checksum: "a".repeat(64),
      version: "2026-08-v2",
    });
  });

  it("blocks startup while another replica owns pending audit evidence", async () => {
    const repository = createRepository({
      activationAuditBlocked: true,
      activationAuditClaimToken: null,
      activationAuditPending: false,
      activated: false,
      checksum: "a".repeat(64),
      previousVersion: "2026-08-v1",
      version: "2026-08-v2",
    });

    await expect(
      reconcileBillingCatalog(
        createContext(createMemoryAuditSink()),
        { catalog: currentBillingCatalog },
        { catalogDeploymentRepository: repository },
      ),
    ).rejects.toBeInstanceOf(BillingCatalogActivationAuditInProgressError);
    expect(repository.markActivationAudited).not.toHaveBeenCalled();
  });

  it("rejects non-system callers before touching persistence", async () => {
    const repository = createRepository({
      activationAuditBlocked: false,
      activationAuditClaimToken: null,
      activationAuditPending: false,
      activated: false,
      checksum: "a".repeat(64),
      previousVersion: null,
      version: "2026-08-v2",
    });
    const context = createServiceContext({
      actor: { id: "owner", kind: "user" },
      permissions: ["billing.catalog.deploy"],
      request: { requestId: "catalog_test_denied" },
    });

    await expect(
      reconcileBillingCatalog(
        context,
        { catalog: currentBillingCatalog },
        { catalogDeploymentRepository: repository },
      ),
    ).rejects.toBeInstanceOf(BillingCatalogDeploymentAuthorizationError);
    expect(repository.reconcile).not.toHaveBeenCalled();
  });

  it("rejects a future catalog before touching persistence", async () => {
    const repository = createRepository({
      activationAuditBlocked: false,
      activationAuditClaimToken: null,
      activationAuditPending: false,
      activated: false,
      checksum: "a".repeat(64),
      previousVersion: null,
      version: "2026-08-v2",
    });

    await expect(
      reconcileBillingCatalog(
        createContext(createMemoryAuditSink()),
        {
          catalog: {
            ...currentBillingCatalog,
            publishedAt: "2026-08-11T03:00:00.000Z",
          },
          now: new Date("2026-08-10T03:00:00.000Z"),
        },
        { catalogDeploymentRepository: repository },
      ),
    ).rejects.toBeInstanceOf(BillingCatalogNotPublishedError);
    expect(repository.reconcile).not.toHaveBeenCalled();
  });
});

function createContext(audit: ReturnType<typeof createMemoryAuditSink>) {
  return createServiceContext({
    actor: { id: "billing_catalog_deploy", kind: "system" },
    audit,
    auditFailureTier: "required",
    permissions: ["billing.catalog.deploy"],
    request: { requestId: "catalog_test" },
  });
}

function createRepository(
  result: Awaited<ReturnType<BillingCatalogDeploymentRepository["reconcile"]>>,
): BillingCatalogDeploymentRepository {
  return {
    markActivationAudited: vi.fn(async () => undefined),
    reconcile: vi.fn(async () => result),
    releaseActivationAuditClaim: vi.fn(async () => undefined),
  };
}
