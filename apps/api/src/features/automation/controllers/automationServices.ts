import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { AutomationRunRepository } from "../../../domains/automation/ports/automationRunRepository.js";
import type {
  AutomationRun,
  AutomationRunList,
} from "../../../domains/automation/models.js";
import {
  createAutomationPreviewRun,
  type CreateAutomationPreviewRunInput,
} from "../../../domains/automation/services/AutomationService/createAutomationPreviewRun.js";
import {
  listAutomationRuns,
  type ListAutomationRunsInput,
} from "../../../domains/automation/services/AutomationService/listAutomationRuns.js";
import { getAutomationRun } from "../../../domains/automation/services/AutomationService/getAutomationRun.js";
import { cancelAutomationRun } from "../../../domains/automation/services/AutomationService/cancelAutomationRun.js";
import { approveAutomationStep } from "../../../domains/automation/services/AutomationService/approveAutomationStep.js";
import { rejectAutomationStep } from "../../../domains/automation/services/AutomationService/rejectAutomationStep.js";
import type { DecideAutomationStepInput } from "../../../domains/automation/services/AutomationService/serviceSupport.js";
import { createMemoryAutomationRunRepository } from "../adapters/memory/automationRunRepository.js";

export type AutomationServices = {
  approveStep: (
    context: ServiceContext,
    input: DecideAutomationStepInput,
  ) => Promise<AutomationRun>;
  cancelRun: (
    context: ServiceContext,
    input: { expectedRunVersion: number; runId: string },
  ) => Promise<AutomationRun>;
  createPreview: (
    context: ServiceContext,
    input: CreateAutomationPreviewRunInput,
  ) => Promise<AutomationRun>;
  getRun: (
    context: ServiceContext,
    input: { runId: string },
  ) => Promise<AutomationRun>;
  listRuns: (
    context: ServiceContext,
    input: ListAutomationRunsInput,
  ) => Promise<AutomationRunList>;
  rejectStep: (
    context: ServiceContext,
    input: DecideAutomationStepInput,
  ) => Promise<AutomationRun>;
};

export function createAutomationServices(
  automationRunRepository: AutomationRunRepository,
): AutomationServices {
  const ports = { automationRunRepository };
  return {
    approveStep: (context, input) =>
      approveAutomationStep(context, input, ports),
    cancelRun: (context, input) => cancelAutomationRun(context, input, ports),
    createPreview: (context, input) =>
      createAutomationPreviewRun(context, input, ports),
    getRun: (context, input) => getAutomationRun(context, input, ports),
    listRuns: (context, input) => listAutomationRuns(context, input, ports),
    rejectStep: (context, input) => rejectAutomationStep(context, input, ports),
  };
}

export const automationServices = createAutomationServices(
  createMemoryAutomationRunRepository(),
);
