import { AutomationInvalidTransitionError } from "../errors.js";
import type {
  AutomationApprovalStatus,
  AutomationRunStatus,
  AutomationStepStatus,
} from "../models.js";

type AutomationDecision = "approved" | "rejected";

export function assertRunDecisionTransition(
  current: AutomationRunStatus,
  target: AutomationDecision | "cancelled",
): void {
  if (current === "awaiting_approval") return;
  throw new AutomationInvalidTransitionError(current);
}

export function assertStepDecisionTransition(
  current: AutomationStepStatus,
  target: AutomationDecision | "cancelled",
): void {
  if (current === "awaiting_approval") return;
  throw new AutomationInvalidTransitionError(current);
}

export function assertApprovalDecisionTransition(
  current: AutomationApprovalStatus,
  target: AutomationDecision | "cancelled",
): void {
  if (current === "pending") return;
  throw new AutomationInvalidTransitionError(current);
}
