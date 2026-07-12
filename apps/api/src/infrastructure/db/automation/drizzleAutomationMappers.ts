import type {
  automationApprovals,
  automationRuns,
  automationSteps,
} from "@lojaveiculosv2/db";
import type {
  AutomationApproval,
  AutomationRun,
  AutomationRunContext,
  AutomationStep,
} from "../../../domains/automation/models.js";

export type AutomationRunRow = typeof automationRuns.$inferSelect;
export type AutomationStepRow = typeof automationSteps.$inferSelect;
export type AutomationApprovalRow = typeof automationApprovals.$inferSelect;

export function toAutomationRun(
  row: AutomationRunRow,
  stepRows: AutomationStepRow[],
  approvalRows: AutomationApprovalRow[],
): AutomationRun {
  const approvalsByStep = new Map(
    approvalRows.map((approval) => [approval.stepId, approval]),
  );
  return {
    context: toRunContext(row.context),
    createdAt: row.createdAt,
    createdByActorId: row.createdByActorId,
    executionEnabled: false,
    id: row.id,
    objective: row.objective,
    status: row.status,
    steps: stepRows.map((step) =>
      toAutomationStep(step, approvalsByStep.get(step.id) ?? null),
    ),
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

function toAutomationStep(
  row: AutomationStepRow,
  approvalRow: AutomationApprovalRow | null,
): AutomationStep {
  return {
    approval: approvalRow ? toAutomationApproval(approvalRow) : null,
    createdAt: row.createdAt,
    executionEnabled: false,
    id: row.id,
    kind: row.kind,
    position: row.position,
    risk: row.risk,
    status: row.status,
    summary: row.summary,
    title: row.title,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

function toAutomationApproval(row: AutomationApprovalRow): AutomationApproval {
  return {
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
    decidedByActorId: row.decidedByActorId,
    id: row.id,
    proposalDigest: row.proposalDigest,
    status: row.status,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

function toRunContext(value: unknown): AutomationRunContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.module === "string" ? { module: record.module } : {}),
    ...(typeof record.resourceId === "string"
      ? { resourceId: record.resourceId }
      : {}),
  };
}
