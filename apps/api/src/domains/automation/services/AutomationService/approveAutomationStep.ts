import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { AutomationRun } from "../../models.js";
import {
  executeAutomationStepDecision,
  type AutomationServicePorts,
  type DecideAutomationStepInput,
} from "./serviceSupport.js";

export async function approveAutomationStep(
  context: ServiceContext,
  input: DecideAutomationStepInput,
  ports: AutomationServicePorts,
): Promise<AutomationRun> {
  return executeAutomationStepDecision({
    context,
    decision: "approved",
    ports,
    request: input,
  });
}
