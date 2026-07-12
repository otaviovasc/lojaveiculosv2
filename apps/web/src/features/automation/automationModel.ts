import type {
  AutomationDecisionInput,
  AutomationRun,
  AutomationRunStatus,
  AutomationRunStep,
} from "./types";
import type { FeatureStatusTone } from "../../components/ui/FeatureStates";

export function automationStatusLabel(status: AutomationRunStatus) {
  if (status === "awaiting_approval") return "Aguardando revisão";
  if (status === "approved") return "Plano aprovado";
  if (status === "rejected") return "Rejeitado";
  return "Cancelado";
}

export function automationStatusTone(
  status: AutomationRunStatus,
): FeatureStatusTone {
  if (status === "awaiting_approval") return "warning";
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

export function toDecisionInput(
  run: AutomationRun,
  step: AutomationRunStep,
): AutomationDecisionInput | null {
  if (!step.approval || step.approval.status !== "pending") return null;
  return {
    expectedApprovalVersion: step.approval.version,
    expectedProposalDigest: step.approval.proposalDigest,
    expectedRunVersion: run.version,
    expectedStepVersion: step.version,
    runId: run.id,
    stepId: step.id,
  };
}

export function shortDigest(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

export function formatAutomationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
