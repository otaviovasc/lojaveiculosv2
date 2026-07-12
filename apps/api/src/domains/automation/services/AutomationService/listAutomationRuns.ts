import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { AutomationRunList } from "../../models.js";
import { AutomationInputError } from "../../errors.js";
import {
  requireAutomationScope,
  type AutomationServicePorts,
} from "./serviceSupport.js";

export type ListAutomationRunsInput = { limit: number; offset: number };

export async function listAutomationRuns(
  context: ServiceContext,
  input: ListAutomationRunsInput,
  ports: AutomationServicePorts,
): Promise<AutomationRunList> {
  assertPermission(context, "automation.read");
  const scope = requireAutomationScope(context);
  if (
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100 ||
    !Number.isInteger(input.offset) ||
    input.offset < 0 ||
    input.offset > 10_000
  ) {
    throw new AutomationInputError("Automation pagination is invalid.");
  }
  context.logger.info(
    "automation.runs.list.started",
    createServiceLogMetadata(context, input),
  );
  const result = await ports.automationRunRepository.list({
    ...scope,
    ...input,
  });
  await context.audit.record({
    action: "automation.runs.list",
    actor: context.actor,
    category: "data_access",
    entityId: scope.storeId,
    entityType: "automation_run",
    metadata: {
      limit: input.limit,
      offset: input.offset,
      permission: "automation.read",
      returned: result.items.length,
      total: result.total,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: scope.storeId,
    summary: "Listed automation runs",
    tenantId: scope.tenantId,
  });
  return result;
}
