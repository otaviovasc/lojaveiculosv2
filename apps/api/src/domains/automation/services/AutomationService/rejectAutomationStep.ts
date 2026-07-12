import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { AutomationRun } from "../../models.js";
import {
  executeAutomationStepDecision,
  type AutomationServicePorts,
  type DecideAutomationStepInput,
} from "./serviceSupport.js";

export async function rejectAutomationStep(
  context: ServiceContext,
  input: DecideAutomationStepInput,
  ports: AutomationServicePorts,
): Promise<AutomationRun> {
  return executeAutomationStepDecision({
    context,
    decision: "rejected",
    ports,
    request: input,
  });
}
