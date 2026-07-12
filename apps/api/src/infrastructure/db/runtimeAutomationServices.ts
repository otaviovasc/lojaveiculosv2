import {
  createAutomationServices,
  type AutomationServices,
} from "../../features/automation/controllers/automationServices.js";
import {
  createDrizzleAutomationRunRepository,
  type DrizzleAutomationClient,
} from "./automation/drizzleAutomationRunRepository.js";

export function createRuntimeAutomationServices(
  db: unknown,
): AutomationServices {
  return createAutomationServices(
    createDrizzleAutomationRunRepository(db as DrizzleAutomationClient),
  );
}
