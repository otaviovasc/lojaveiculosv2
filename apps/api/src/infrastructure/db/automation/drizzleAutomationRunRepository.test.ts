import { describe, expect, it } from "vitest";
import type { AutomationRunRepository } from "../../../domains/automation/ports/automationRunRepository.js";
import { createDrizzleAutomationRunRepository } from "./drizzleAutomationRunRepository.js";
import {
  automationTestIds,
  createAutomationStoredRows,
  createFakeAutomationDb,
} from "./drizzleAutomationRunRepository.testSupport.js";

type DecisionInput = Parameters<AutomationRunRepository["decideStep"]>[0];

describe("Drizzle automation run repository", () => {
  it("isolates the run, steps, and approvals by tenant and store", async () => {
    const rows = createAutomationStoredRows();
    const crossScopeStep = {
      ...rows.steps[0]!,
      id: "10000000-0000-4000-8000-000000000012",
      storeId: "20000000-0000-4000-8000-000000000002",
      tenantId: "30000000-0000-4000-8000-000000000002",
    };
    rows.steps.push(crossScopeStep);
    rows.approvals.push({
      ...rows.approvals[0]!,
      id: "10000000-0000-4000-8000-000000000013",
      stepId: crossScopeStep.id,
      storeId: crossScopeStep.storeId,
      tenantId: crossScopeStep.tenantId,
    });
    const fake = createFakeAutomationDb(rows);
    const repository = createDrizzleAutomationRunRepository(fake.db);

    const found = await repository.findById(scope());
    const wrongStore = await repository.findById({
      ...scope(),
      storeId: "20000000-0000-4000-8000-000000000002" as never,
    });
    const wrongTenant = await repository.findById({
      ...scope(),
      tenantId: "30000000-0000-4000-8000-000000000002" as never,
    });

    expect(found?.steps).toHaveLength(1);
    expect(found?.steps[0]?.approval?.id).toBe(automationTestIds.approvalId);
    expect(wrongStore).toBeNull();
    expect(wrongTenant).toBeNull();
  });

  it.each([
    ["run version", { expectedRunVersion: 2 }],
    ["step version", { expectedStepVersion: 2 }],
    ["approval version", { expectedApprovalVersion: 2 }],
    ["proposal digest", { expectedProposalDigest: "b".repeat(64) }],
    [
      "store scope",
      { storeId: "20000000-0000-4000-8000-000000000002" as never },
    ],
    [
      "tenant scope",
      { tenantId: "30000000-0000-4000-8000-000000000002" as never },
    ],
  ] satisfies ReadonlyArray<readonly [string, Partial<DecisionInput>]>)(
    "rolls back all decision rows when the %s predicate is stale",
    async (_label, mismatch) => {
      const fake = createFakeAutomationDb();
      const repository = createDrizzleAutomationRunRepository(fake.db);

      const result = await repository.decideStep({
        ...decisionInput(),
        ...mismatch,
      });

      expect(result).toEqual({ kind: "stale" });
      expect(fake.telemetry.transactionCalls).toBe(1);
      expect(fake.rows.runs[0]).toMatchObject({
        status: "awaiting_approval",
        version: 1,
      });
      expect(fake.rows.steps[0]).toMatchObject({
        status: "awaiting_approval",
        version: 1,
      });
      expect(fake.rows.approvals[0]).toMatchObject({
        decidedAt: null,
        decidedByActorId: null,
        status: "pending",
        version: 1,
      });
    },
  );

  it("commits one exact digest-bound decision transaction", async () => {
    const fake = createFakeAutomationDb();
    const repository = createDrizzleAutomationRunRepository(fake.db);

    const result = await repository.decideStep(decisionInput());

    expect(result.kind).toBe("updated");
    expect(fake.telemetry.transactionCalls).toBe(1);
    expect(fake.rows.runs[0]).toMatchObject({ status: "approved", version: 2 });
    expect(fake.rows.steps[0]).toMatchObject({
      status: "approved",
      version: 2,
    });
    expect(fake.rows.approvals[0]).toMatchObject({
      decidedByActorId: "user_approver",
      status: "approved",
      version: 2,
    });
  });

  it("records the cancelling actor across the approval ledger", async () => {
    const fake = createFakeAutomationDb();
    const repository = createDrizzleAutomationRunRepository(fake.db);

    const result = await repository.cancel({
      ...scope(),
      cancelledAt: new Date("2026-07-11T12:05:00.000Z"),
      cancelledByActorId: "user_canceller",
      expectedRunVersion: 1,
    });

    expect(result.kind).toBe("updated");
    expect(fake.rows.approvals[0]).toMatchObject({
      decidedByActorId: "user_canceller",
      status: "cancelled",
      version: 2,
    });
  });
});

function scope() {
  return {
    runId: automationTestIds.runId,
    storeId: automationTestIds.storeId as never,
    tenantId: automationTestIds.tenantId as never,
  };
}

function decisionInput(): DecisionInput {
  return {
    ...scope(),
    approvalId: automationTestIds.approvalId,
    decidedAt: new Date("2026-07-11T12:05:00.000Z"),
    decidedByActorId: "user_approver",
    decision: "approved",
    expectedApprovalVersion: 1,
    expectedProposalDigest: "a".repeat(64),
    expectedRunVersion: 1,
    expectedStepVersion: 1,
    runStatus: "approved",
    stepId: automationTestIds.stepId,
    stepStatus: "approved",
  };
}
