import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ServiceContext } from "../shared/serviceContext.js";
import { createMemoryCrmRetentionRepository } from "../domains/crm/retention/testSupportRetentionRepository.js";
import {
  deliverCrmRetentionAuditOutbox,
  executeCrmRetentionJob,
  readCrmRetentionJobConfig,
} from "./crmRetentionJob.js";

describe("CRM retention job", () => {
  it("starts the API workspace script from the Railway monorepo root", () => {
    const railway = readFileSync(
      new URL("../../../../.railway/railway.ts", import.meta.url),
      "utf8",
    );

    expect(railway).toContain(
      'start: "pnpm --filter @lojaveiculosv2/api crm:retention:process"',
    );
    expect(railway).toContain('CRM_RETENTION_DRY_RUN: "true"');
  });

  it("defaults to dry-run and bounds operational batch settings", () => {
    expect(
      readCrmRetentionJobConfig({
        CRM_RETENTION_BATCH_SIZE: "900",
        CRM_RETENTION_MAX_BATCHES: "0",
        CRM_RETENTION_SCOPE_LIMIT: "5000",
      }),
    ).toEqual({
      batchSize: 500,
      dryRun: true,
      leaseSeconds: 900,
      maxBatchesPerScope: 20,
      scopeLimit: 1000,
    });
  });

  it("walks bounded cursor pages without exposing candidate data", async () => {
    const repository = createMemoryCrmRetentionRepository({
      items: [
        memoryItem("one", "2026-01-01"),
        memoryItem("two", "2026-01-02"),
        memoryItem("three", "2026-01-03"),
      ],
    });
    const result = await executeCrmRetentionJob({
      config: {
        batchSize: 1,
        dryRun: true,
        leaseSeconds: 900,
        maxBatchesPerScope: 2,
        scopeLimit: 100,
      },
      context: () => context(),
      leaseOwner: "worker_1",
      now: new Date("2026-08-12T15:00:00.000Z"),
      repository,
    });

    expect(result).toMatchObject({
      affected: 0,
      batches: 2,
      dryRun: true,
      eligible: 2,
      scopes: 1,
      truncated: 1,
    });
  });

  it("discovers and processes every store scope independently", async () => {
    const repository = createMemoryCrmRetentionRepository({
      items: [
        memoryItem("one", "2026-01-01"),
        { ...memoryItem("two", "2026-01-02"), storeId: "store_2" },
      ],
    });
    const scopes: string[] = [];
    const result = await executeCrmRetentionJob({
      config: {
        batchSize: 10,
        dryRun: false,
        leaseSeconds: 900,
        maxBatchesPerScope: 2,
        scopeLimit: 100,
      },
      context: (scope) => {
        scopes.push(scope.storeId);
        return { ...context(), storeId: scope.storeId };
      },
      leaseOwner: "worker_1",
      now: new Date("2026-08-12T15:00:00.000Z"),
      repository,
    });

    expect(scopes).toEqual(["store_1", "store_2"]);
    expect(result).toMatchObject({ affected: 2, scopes: 2 });
  });

  it("retries durable sanitized audit intents after audit DB failure", async () => {
    const repository = createMemoryCrmRetentionRepository();
    const record = {
      actorId: "worker",
      actorKind: "system" as const,
      affectedCount: 2,
      auditId: "audit_1",
      dryRun: false as const,
      eligibleCount: 2,
      id: "outbox_1",
      legalHoldSkipped: 1,
      occurredAt: new Date("2026-08-12T14:59:00.000Z"),
      requestId: "request_1",
      storeId: "store_1",
      tenantId: "tenant_1",
      verified: true,
    };
    repository.claimAuditOutbox = vi.fn(async () => [record]);
    const markAuditOutbox = vi.fn(async () => true);
    repository.markAuditOutbox = markAuditOutbox;
    const secret = "customer-body-must-not-leak";
    const result = await deliverCrmRetentionAuditOutbox({
      audit: { record: vi.fn(async () => Promise.reject(new Error(secret))) },
      leaseOwner: "worker_1",
      limit: 10,
      now: new Date("2026-08-12T15:00:00.000Z"),
      repository,
    });

    expect(result).toEqual({ claimed: 1, delivered: 0, failed: 1 });
    expect(markAuditOutbox).toHaveBeenCalledWith(
      expect.objectContaining({ succeeded: false }),
    );
    expect(JSON.stringify(markAuditOutbox.mock.calls)).not.toContain(secret);
  });
});

function memoryItem(id: string, eligibleAt: string) {
  return {
    category: "bot_interaction" as const,
    eligibleAt: new Date(`${eligibleAt}T00:00:00.000Z`),
    id,
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}

function context(): ServiceContext {
  return {
    actor: { id: "crm_retention_worker", kind: "system" },
    audit: { record: vi.fn(async () => undefined) },
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
    permissions: ["crm.manage"],
    platformAdmin: false,
    requestId: "request_1",
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
