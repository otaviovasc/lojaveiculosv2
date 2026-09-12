import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentBillingCatalog } from "../../../domains/billing/catalog/currentBillingCatalog.js";
import { billingCatalogChecksum } from "../../../domains/billing/catalog/billingCatalogIntegrity.js";
import type { BillingCatalogDefinition } from "../../../domains/billing/catalog/billingCatalogDefinition.js";
import { billingCatalog2026_08_v2 } from "../../../domains/billing/catalog/versions/billingCatalog2026_08_v2.js";
import type { claimCatalogActivationAudit } from "./drizzleBillingCatalogActivationAudit.js";
import type {
  BillingCatalogDeploymentClient,
  loadPersistedBillingCatalog,
  toDatabaseAddonLimits,
  toDatabasePlanLimits,
} from "./drizzleBillingCatalogDeploymentMapping.js";

type ActivationAuditModule = {
  claimCatalogActivationAudit: typeof claimCatalogActivationAudit;
};
type DeploymentMappingModule = {
  loadPersistedBillingCatalog: typeof loadPersistedBillingCatalog;
  toDatabaseAddonLimits: typeof toDatabaseAddonLimits;
  toDatabasePlanLimits: typeof toDatabasePlanLimits;
};

const mocks = vi.hoisted(() => ({
  claimCatalogActivationAudit: vi.fn<typeof claimCatalogActivationAudit>(),
  loadPersistedBillingCatalog: vi.fn<typeof loadPersistedBillingCatalog>(),
}));

vi.mock("./drizzleBillingCatalogActivationAudit.js", async (importOriginal) => {
  const actual = await importOriginal<ActivationAuditModule>();
  return {
    ...actual,
    claimCatalogActivationAudit: mocks.claimCatalogActivationAudit,
  };
});

vi.mock(
  "./drizzleBillingCatalogDeploymentMapping.js",
  async (importOriginal) => {
    const actual = await importOriginal<DeploymentMappingModule>();
    return {
      ...actual,
      loadPersistedBillingCatalog: mocks.loadPersistedBillingCatalog,
    };
  },
);

import { createDrizzleBillingCatalogDeploymentRepository } from "./drizzleBillingCatalogDeploymentRepository.js";

describe("drizzle billing catalog deployment repository", () => {
  beforeEach(() => {
    mocks.loadPersistedBillingCatalog.mockReset();
    mocks.loadPersistedBillingCatalog.mockResolvedValue(currentBillingCatalog);
    mocks.claimCatalogActivationAudit.mockReset();
    mocks.claimCatalogActivationAudit.mockImplementation(
      async (_db, _versionRow, input, result) => ({
        ...result,
        activationAuditBlocked: false,
        activationAuditClaimToken: input.auditClaimToken,
        activationAuditPending: true,
      }),
    );
  });

  it("installs and activates a valid catalog with no add-ons", async () => {
    const insertedBatchSizes: number[] = [];
    const repository = createDrizzleBillingCatalogDeploymentRepository(
      deploymentClient(insertedBatchSizes, currentBillingCatalog),
    );

    const result = await repository.reconcile({
      auditClaimToken: "catalog_claim_1",
      catalog: currentBillingCatalog,
      checksum: billingCatalogChecksum(currentBillingCatalog),
      now: new Date("2026-08-26T12:00:00.000Z"),
    });

    expect(result).toMatchObject({
      activated: true,
      activationAuditPending: true,
      version: "2026-08-v3",
    });
    expect(insertedBatchSizes).not.toContain(0);
    expect(insertedBatchSizes).toContain(currentBillingCatalog.plans.length);
    expect(insertedBatchSizes).toHaveLength(3);
  });

  it("continues to persist add-ons from historical catalogs", async () => {
    const insertedBatchSizes: number[] = [];
    mocks.loadPersistedBillingCatalog.mockResolvedValue(
      billingCatalog2026_08_v2,
    );
    const repository = createDrizzleBillingCatalogDeploymentRepository(
      deploymentClient(insertedBatchSizes, billingCatalog2026_08_v2),
    );

    await repository.reconcile({
      auditClaimToken: "catalog_claim_2",
      catalog: billingCatalog2026_08_v2,
      checksum: billingCatalogChecksum(billingCatalog2026_08_v2),
      now: new Date("2026-08-26T12:00:00.000Z"),
    });

    expect(insertedBatchSizes).not.toContain(0);
    expect(insertedBatchSizes).toHaveLength(4);
  });
});

function deploymentClient(
  insertedBatchSizes: number[],
  catalog: BillingCatalogDefinition,
) {
  const checksum = billingCatalogChecksum(catalog);
  const versionRow = {
    activatedAt: null,
    activationAuditClaimedAt: null,
    activationAuditClaimToken: null,
    activationAuditRecordedAt: null,
    checksum,
    createdAt: new Date(),
    definition: catalog,
    previousVersion: null,
    publishedAt: new Date(catalog.publishedAt),
    status: "staged",
    updatedAt: new Date(),
    version: catalog.version,
  };
  const client = {
    execute: async () => undefined,
    insert: () => ({
      values: (value: unknown | readonly unknown[]) => {
        const size = Array.isArray(value) ? value.length : 1;
        if (size === 0) {
          throw new Error("values() must be called with at least one value");
        }
        insertedBatchSizes.push(size);
        return {
          returning: async () => (Array.isArray(value) ? [] : [versionRow]),
        };
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [] }),
      }),
    }),
    transaction: async (operation: (transaction: unknown) => unknown) =>
      operation(client),
    update: () => ({
      set: () => ({ where: () => undefined }),
    }),
  };
  return client as unknown as BillingCatalogDeploymentClient;
}
