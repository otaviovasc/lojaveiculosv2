import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import {
  createServiceLogMetadata,
  type ServiceContext,
  type StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { AutomationRunRepository } from "../../ports/automationRunRepository.js";
import {
  AutomationApprovalNotFoundError,
  AutomationRunNotFoundError,
  AutomationStaleApprovalError,
  AutomationStepNotFoundError,
} from "../../errors.js";
import type { AutomationRun } from "../../models.js";
import {
  assertApprovalDecisionTransition,
  assertRunDecisionTransition,
  assertStepDecisionTransition,
} from "../../state/automationStateMachine.js";

export type AutomationServicePorts = {
  automationRunRepository: AutomationRunRepository;
};

export class AutomationScopeError extends Error {
  constructor() {
    super("Automation requires tenant and store scope.");
    this.name = "AutomationScopeError";
  }
}

export function requireAutomationScope(context: ServiceContext) {
  if (!context.storeId || !context.tenantId) throw new AutomationScopeError();
  const scopedContext: StoreScopedServiceContext = {
    ...context,
    entitlements: readEntitlements(context),
    storeId: context.storeId,
    tenantId: context.tenantId,
  };
  assertEntitlement(scopedContext, "automation");
  return {
    storeId: context.storeId as StoreId,
    tenantId: context.tenantId as TenantId,
  };
}

export type DecideAutomationStepInput = {
  expectedApprovalVersion: number;
  expectedProposalDigest: string;
  expectedRunVersion: number;
  expectedStepVersion: number;
  runId: string;
  stepId: string;
};

export async function decideAutomationStep(input: {
  actorId: string;
  decision: "approved" | "rejected";
  now: Date;
  ports: AutomationServicePorts;
  request: DecideAutomationStepInput;
  scope: ReturnType<typeof requireAutomationScope>;
}): Promise<AutomationRun> {
  const run = await input.ports.automationRunRepository.findById({
    ...input.scope,
    runId: input.request.runId,
  });
  if (!run) throw new AutomationRunNotFoundError();
  const step = run.steps.find((item) => item.id === input.request.stepId);
  if (!step) throw new AutomationStepNotFoundError();
  if (!step.approval) throw new AutomationApprovalNotFoundError();

  if (
    run.version !== input.request.expectedRunVersion ||
    step.version !== input.request.expectedStepVersion ||
    step.approval.version !== input.request.expectedApprovalVersion ||
    step.approval.proposalDigest !== input.request.expectedProposalDigest
  ) {
    throw new AutomationStaleApprovalError();
  }

  assertRunDecisionTransition(run.status, input.decision);
  assertStepDecisionTransition(step.status, input.decision);
  assertApprovalDecisionTransition(step.approval.status, input.decision);
  const result = await input.ports.automationRunRepository.decideStep({
    ...input.scope,
    approvalId: step.approval.id,
    decidedAt: input.now,
    decidedByActorId: input.actorId,
    decision: input.decision,
    expectedApprovalVersion: input.request.expectedApprovalVersion,
    expectedProposalDigest: input.request.expectedProposalDigest,
    expectedRunVersion: input.request.expectedRunVersion,
    expectedStepVersion: input.request.expectedStepVersion,
    runId: run.id,
    runStatus: input.decision,
    stepId: step.id,
    stepStatus: input.decision,
  });
  if (result.kind === "stale") throw new AutomationStaleApprovalError();
  return result.run;
}

export async function executeAutomationStepDecision(input: {
  context: ServiceContext;
  decision: "approved" | "rejected";
  ports: AutomationServicePorts;
  request: DecideAutomationStepInput;
}) {
  assertPermission(input.context, "automation.approve");
  const scope = requireAutomationScope(input.context);
  const action = input.decision === "approved" ? "approve" : "reject";
  input.context.logger.info(
    `automation.step.${action}.started`,
    createServiceLogMetadata(input.context, {
      runId: input.request.runId,
      stepId: input.request.stepId,
    }),
  );
  const run = await decideAutomationStep({
    actorId: input.context.actor.id,
    decision: input.decision,
    now: new Date(),
    ports: input.ports,
    request: input.request,
    scope,
  });
  await input.context.audit.record({
    action: `automation.step.${action}`,
    actor: input.context.actor,
    category: "data_change",
    criticality: "critical",
    entityId: input.request.stepId,
    entityType: "automation_step",
    metadata: {
      executionEnabled: false,
      permission: "automation.approve",
      runId: run.id,
      status: run.status,
    },
    outcome: "succeeded",
    requestId: input.context.requestId,
    storeId: scope.storeId,
    summary:
      input.decision === "approved"
        ? "Approved read-only automation preview"
        : "Rejected read-only automation preview",
    tenantId: scope.tenantId,
  });
  return run;
}

function readEntitlements(
  context: ServiceContext,
): StoreScopedServiceContext["entitlements"] {
  if (!("entitlements" in context)) return [];
  const entitlements = context.entitlements;
  return Array.isArray(entitlements)
    ? (entitlements as StoreScopedServiceContext["entitlements"])
    : [];
}
