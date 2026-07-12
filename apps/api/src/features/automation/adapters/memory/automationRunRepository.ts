import type {
  AutomationRun,
  AutomationRunSummary,
} from "../../../../domains/automation/models.js";
import type {
  AutomationRunRepository,
  CreateAutomationPreviewRecordInput,
} from "../../../../domains/automation/ports/automationRunRepository.js";

export function createMemoryAutomationRunRepository(): AutomationRunRepository {
  let runs: AutomationRun[] = [];
  return {
    async cancel(input) {
      const index = findRunIndex(runs, input);
      const current = runs[index];
      if (
        !current ||
        current.version !== input.expectedRunVersion ||
        current.status !== "awaiting_approval"
      ) {
        return { kind: "stale" };
      }
      const run = cloneRun({
        ...current,
        status: "cancelled",
        steps: current.steps.map((step) => ({
          ...step,
          approval:
            step.approval?.status === "pending"
              ? {
                  ...step.approval,
                  decidedAt: input.cancelledAt,
                  decidedByActorId: input.cancelledByActorId,
                  status: "cancelled",
                  updatedAt: input.cancelledAt,
                  version: step.approval.version + 1,
                }
              : step.approval,
          ...(step.status === "awaiting_approval"
            ? {
                status: "cancelled" as const,
                updatedAt: input.cancelledAt,
                version: step.version + 1,
              }
            : {}),
        })),
        updatedAt: input.cancelledAt,
        version: current.version + 1,
      });
      runs[index] = run;
      return { kind: "updated", run: cloneRun(run) };
    },
    async createPreview(input) {
      const run = createRun(input);
      runs = [run, ...runs];
      return cloneRun(run);
    },
    async decideStep(input) {
      const index = findRunIndex(runs, input);
      const current = runs[index];
      const step = current?.steps.find((item) => item.id === input.stepId);
      const approval = step?.approval;
      if (
        !current ||
        !step ||
        !approval ||
        current.status !== "awaiting_approval" ||
        current.version !== input.expectedRunVersion ||
        step.status !== "awaiting_approval" ||
        step.version !== input.expectedStepVersion ||
        approval.status !== "pending" ||
        approval.version !== input.expectedApprovalVersion ||
        approval.proposalDigest !== input.expectedProposalDigest
      ) {
        return { kind: "stale" };
      }
      const run = cloneRun({
        ...current,
        status: input.runStatus,
        steps: current.steps.map((item) =>
          item.id === step.id
            ? {
                ...item,
                approval: {
                  ...approval,
                  decidedAt: input.decidedAt,
                  decidedByActorId: input.decidedByActorId,
                  status: input.decision,
                  updatedAt: input.decidedAt,
                  version: approval.version + 1,
                },
                status: input.stepStatus,
                updatedAt: input.decidedAt,
                version: item.version + 1,
              }
            : item,
        ),
        updatedAt: input.decidedAt,
        version: current.version + 1,
      });
      runs[index] = run;
      return { kind: "updated", run: cloneRun(run) };
    },
    async findById(input) {
      const index = findRunIndex(runs, input);
      return index < 0 ? null : cloneRun(runs[index] as AutomationRun);
    },
    async list(input) {
      const scoped = runs
        .filter(
          (run) =>
            run.storeId === input.storeId && run.tenantId === input.tenantId,
        )
        .sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        );
      return {
        items: scoped
          .slice(input.offset, input.offset + input.limit)
          .map(toSummary),
        limit: input.limit,
        offset: input.offset,
        total: scoped.length,
      };
    },
  };
}

function createRun(input: CreateAutomationPreviewRecordInput): AutomationRun {
  return {
    context: input.context,
    createdAt: input.createdAt,
    createdByActorId: input.createdByActorId,
    executionEnabled: false,
    id: input.runId,
    objective: input.objective,
    status: "awaiting_approval",
    steps: [
      {
        approval: {
          createdAt: input.createdAt,
          decidedAt: null,
          decidedByActorId: null,
          id: input.approvalId,
          proposalDigest: input.proposalDigest,
          status: "pending",
          updatedAt: input.createdAt,
          version: 1,
        },
        createdAt: input.createdAt,
        executionEnabled: false,
        id: input.stepId,
        kind: "read_only_preview",
        position: 1,
        risk: "low",
        status: "awaiting_approval",
        summary: input.stepSummary,
        title: input.stepTitle,
        updatedAt: input.createdAt,
        version: 1,
      },
    ],
    storeId: input.storeId,
    tenantId: input.tenantId,
    updatedAt: input.createdAt,
    version: 1,
  };
}

function findRunIndex(
  runs: AutomationRun[],
  input: { runId: string; storeId: string; tenantId: string },
) {
  return runs.findIndex(
    (run) =>
      run.id === input.runId &&
      run.storeId === input.storeId &&
      run.tenantId === input.tenantId,
  );
}

function toSummary(run: AutomationRun): AutomationRunSummary {
  const { context: _context, steps, ...summary } = cloneRun(run);
  return {
    ...summary,
    pendingApprovalCount: steps.filter(
      (step) => step.approval?.status === "pending",
    ).length,
    stepCount: steps.length,
  };
}

function cloneRun(run: AutomationRun): AutomationRun {
  return structuredClone(run);
}
