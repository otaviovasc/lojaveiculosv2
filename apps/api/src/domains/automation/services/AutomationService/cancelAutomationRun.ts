import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  AutomationRunNotFoundError,
  AutomationStaleVersionError,
} from "../../errors.js";
import type { AutomationRun } from "../../models.js";
import { assertRunDecisionTransition } from "../../state/automationStateMachine.js";
import {
  requireAutomationScope,
  type AutomationServicePorts,
} from "./serviceSupport.js";

export async function cancelAutomationRun(
  context: ServiceContext,
  input: { expectedRunVersion: number; runId: string },
  ports: AutomationServicePorts,
): Promise<AutomationRun> {
  assertPermission(context, "automation.cancel");
  const scope = requireAutomationScope(context);
  context.logger.info(
    "automation.run.cancel.started",
    createServiceLogMetadata(context, { runId: input.runId }),
  );
  const run = await ports.automationRunRepository.findById({
    ...scope,
    ...input,
  });
  if (!run) throw new AutomationRunNotFoundError();
  if (run.version !== input.expectedRunVersion) {
    throw new AutomationStaleVersionError();
  }
  assertRunDecisionTransition(run.status, "cancelled");
  const result = await ports.automationRunRepository.cancel({
    ...scope,
    cancelledAt: new Date(),
    cancelledByActorId: context.actor.id,
    expectedRunVersion: input.expectedRunVersion,
    runId: run.id,
  });
  if (result.kind === "stale") throw new AutomationStaleVersionError();
  await context.audit.record({
    action: "automation.run.cancel",
    actor: context.actor,
    category: "data_change",
    criticality: "critical",
    entityId: run.id,
    entityType: "automation_run",
    metadata: {
      fromStatus: run.status,
      permission: "automation.cancel",
      toStatus: "cancelled",
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Cancelled automation preview",
    tenantId: scope.tenantId,
  });
  return result.run;
}
