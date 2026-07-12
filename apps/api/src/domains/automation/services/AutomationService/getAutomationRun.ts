import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { AutomationRunNotFoundError } from "../../errors.js";
import type { AutomationRun } from "../../models.js";
import {
  requireAutomationScope,
  type AutomationServicePorts,
} from "./serviceSupport.js";

export async function getAutomationRun(
  context: ServiceContext,
  input: { runId: string },
  ports: AutomationServicePorts,
): Promise<AutomationRun> {
  assertPermission(context, "automation.read");
  const scope = requireAutomationScope(context);
  context.logger.info(
    "automation.run.get.started",
    createServiceLogMetadata(context, { runId: input.runId }),
  );
  const run = await ports.automationRunRepository.findById({
    ...scope,
    ...input,
  });
  if (!run) throw new AutomationRunNotFoundError();
  await context.audit.record({
    action: "automation.run.get",
    actor: context.actor,
    category: "data_access",
    entityId: run.id,
    entityType: "automation_run",
    metadata: { permission: "automation.read", status: run.status },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Read automation run",
    tenantId: scope.tenantId,
  });
  return run;
}
