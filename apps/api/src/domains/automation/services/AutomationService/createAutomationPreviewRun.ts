import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { AutomationInputError } from "../../errors.js";
import type { AutomationRun, AutomationRunContext } from "../../models.js";
import { buildAutomationPreviewProposal } from "../../previewProposal.js";
import {
  requireAutomationScope,
  type AutomationServicePorts,
} from "./serviceSupport.js";

export type CreateAutomationPreviewRunInput = {
  context?: AutomationRunContext | undefined;
  objective: string;
};

export async function createAutomationPreviewRun(
  context: ServiceContext,
  input: CreateAutomationPreviewRunInput,
  ports: AutomationServicePorts,
): Promise<AutomationRun> {
  assertPermission(context, "automation.run");
  const scope = requireAutomationScope(context);
  const objective = input.objective.trim();
  if (objective.length < 3 || objective.length > 2_000) {
    throw new AutomationInputError(
      "Objective must contain between 3 and 2000 characters.",
    );
  }
  const module = normalizeOptionalContextValue(
    input.context?.module,
    "Context module",
    120,
  );
  const resourceId = normalizeOptionalContextValue(
    input.context?.resourceId,
    "Context resource id",
    191,
  );
  const previewContext: AutomationRunContext = {
    ...(module ? { module } : {}),
    ...(resourceId ? { resourceId } : {}),
  };
  const proposal = await buildAutomationPreviewProposal({
    context: previewContext,
    objective,
  });
  const createdAt = new Date();

  context.logger.info(
    "automation.preview.create.started",
    createServiceLogMetadata(context, {
      executionEnabled: false,
      objectiveLength: objective.length,
    }),
  );
  const run = await ports.automationRunRepository.createPreview({
    ...scope,
    approvalId: crypto.randomUUID(),
    context: previewContext,
    createdAt,
    createdByActorId: context.actor.id,
    objective,
    proposalDigest: proposal.digest,
    runId: crypto.randomUUID(),
    stepId: crypto.randomUUID(),
    stepSummary: proposal.summary,
    stepTitle: proposal.title,
  });

  await context.audit.record({
    action: "automation.preview.create",
    actor: context.actor,
    category: "data_change",
    criticality: "high",
    entityId: run.id,
    entityType: "automation_run",
    metadata: {
      executionEnabled: false,
      permission: "automation.run",
      proposalDigest: proposal.digest,
      status: run.status,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Created read-only automation preview",
    tenantId: scope.tenantId,
  });
  return run;
}

function normalizeOptionalContextValue(
  value: string | undefined,
  label: string,
  maxLength: number,
) {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new AutomationInputError(
      `${label} must contain between 1 and ${maxLength} characters.`,
    );
  }
  return normalized;
}
