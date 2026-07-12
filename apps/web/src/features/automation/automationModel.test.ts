import { describe, expect, it } from "vitest";
import { shortDigest, toDecisionInput } from "./automationModel";
import type { AutomationRun } from "./types";

const proposalDigest = "a".repeat(64);

describe("automationModel", () => {
  it("binds a decision to every optimistic version and the proposal digest", () => {
    const run = automationRun();

    expect(toDecisionInput(run, run.steps[0]!)).toEqual({
      expectedApprovalVersion: 2,
      expectedProposalDigest: proposalDigest,
      expectedRunVersion: 4,
      expectedStepVersion: 3,
      runId: "run_1",
      stepId: "step_1",
    });
  });

  it("does not create another decision for an already decided proposal", () => {
    const run = automationRun();
    const step = run.steps[0]!;
    step.approval = { ...step.approval!, status: "approved" };

    expect(toDecisionInput(run, step)).toBeNull();
    expect(shortDigest(proposalDigest)).toBe("aaaaaaaaaa…aaaaaa");
  });
});

function automationRun(): AutomationRun {
  return {
    context: {},
    createdAt: "2026-07-11T12:00:00.000Z",
    createdByActorId: "user_1",
    executionEnabled: false,
    id: "run_1",
    objective: "Revisar veículos sem fotos",
    pendingApprovalCount: 1,
    status: "awaiting_approval",
    steps: [
      {
        approval: {
          createdAt: "2026-07-11T12:00:00.000Z",
          decidedAt: null,
          decidedByActorId: null,
          id: "approval_1",
          proposalDigest,
          status: "pending",
          updatedAt: "2026-07-11T12:00:00.000Z",
          version: 2,
        },
        createdAt: "2026-07-11T12:00:00.000Z",
        executionEnabled: false,
        id: "step_1",
        kind: "read_only_preview",
        position: 1,
        risk: "low",
        status: "awaiting_approval",
        summary: "Listar veículos que ainda não possuem fotos publicadas.",
        title: "Inspecionar inventário",
        updatedAt: "2026-07-11T12:00:00.000Z",
        version: 3,
      },
    ],
    stepCount: 1,
    updatedAt: "2026-07-11T12:00:00.000Z",
    version: 4,
  };
}
