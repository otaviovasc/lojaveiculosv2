import type { AutomationRun, AutomationRunSummary } from "./types";

export const automationProposalDigest = "a".repeat(64);

export function automationRun(
  overrides: Partial<AutomationRun> = {},
): AutomationRun {
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
          proposalDigest: automationProposalDigest,
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
    ...overrides,
  };
}

export function automationSummary(run: AutomationRun): AutomationRunSummary {
  const { context: _context, steps: _steps, ...summary } = run;
  return summary;
}
