import type {
  AutomationRun,
  AutomationRunList,
  AutomationRunSummary,
} from "../../../domains/automation/models.js";

export function automationRunResponse(run: AutomationRun) {
  return {
    data: {
      context: run.context,
      createdAt: run.createdAt.toISOString(),
      createdByActorId: run.createdByActorId,
      executionEnabled: false as const,
      id: run.id,
      objective: run.objective,
      pendingApprovalCount: run.steps.filter(
        (step) => step.approval?.status === "pending",
      ).length,
      status: run.status,
      stepCount: run.steps.length,
      steps: run.steps.map((step) => ({
        approval: step.approval
          ? {
              createdAt: step.approval.createdAt.toISOString(),
              decidedAt: step.approval.decidedAt?.toISOString() ?? null,
              decidedByActorId: step.approval.decidedByActorId,
              id: step.approval.id,
              proposalDigest: step.approval.proposalDigest,
              status: step.approval.status,
              updatedAt: step.approval.updatedAt.toISOString(),
              version: step.approval.version,
            }
          : null,
        createdAt: step.createdAt.toISOString(),
        executionEnabled: false as const,
        id: step.id,
        kind: step.kind,
        position: step.position,
        risk: step.risk,
        status: step.status,
        summary: step.summary,
        title: step.title,
        updatedAt: step.updatedAt.toISOString(),
        version: step.version,
      })),
      updatedAt: run.updatedAt.toISOString(),
      version: run.version,
    },
  };
}

export function automationRunListResponse(result: AutomationRunList) {
  return {
    data: result.items.map(toSummaryDto),
    meta: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

function toSummaryDto(run: AutomationRunSummary) {
  return {
    createdAt: run.createdAt.toISOString(),
    createdByActorId: run.createdByActorId,
    executionEnabled: false as const,
    id: run.id,
    objective: run.objective,
    pendingApprovalCount: run.pendingApprovalCount,
    status: run.status,
    stepCount: run.stepCount,
    updatedAt: run.updatedAt.toISOString(),
    version: run.version,
  };
}
