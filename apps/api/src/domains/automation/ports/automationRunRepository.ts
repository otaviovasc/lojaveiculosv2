import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  AutomationApprovalStatus,
  AutomationRun,
  AutomationRunContext,
  AutomationRunList,
  AutomationRunStatus,
  AutomationStepStatus,
} from "../models.js";

export type AutomationScope = { storeId: StoreId; tenantId: TenantId };

export type CreateAutomationPreviewRecordInput = AutomationScope & {
  approvalId: string;
  createdAt: Date;
  createdByActorId: string;
  objective: string;
  context: AutomationRunContext;
  proposalDigest: string;
  runId: string;
  stepId: string;
  stepSummary: string;
  stepTitle: string;
};

export type AutomationMutationResult =
  { kind: "updated"; run: AutomationRun } | { kind: "stale" };

export type DecideAutomationStepRecordInput = AutomationScope & {
  approvalId: string;
  decidedAt: Date;
  decidedByActorId: string;
  decision: Extract<AutomationApprovalStatus, "approved" | "rejected">;
  expectedApprovalVersion: number;
  expectedProposalDigest: string;
  expectedRunVersion: number;
  expectedStepVersion: number;
  runId: string;
  runStatus: Extract<AutomationRunStatus, "approved" | "rejected">;
  stepId: string;
  stepStatus: Extract<AutomationStepStatus, "approved" | "rejected">;
};

export type AutomationRunRepository = {
  cancel: (
    input: AutomationScope & {
      cancelledAt: Date;
      cancelledByActorId: string;
      expectedRunVersion: number;
      runId: string;
    },
  ) => Promise<AutomationMutationResult>;
  createPreview: (
    input: CreateAutomationPreviewRecordInput,
  ) => Promise<AutomationRun>;
  decideStep: (
    input: DecideAutomationStepRecordInput,
  ) => Promise<AutomationMutationResult>;
  findById: (
    input: AutomationScope & { runId: string },
  ) => Promise<AutomationRun | null>;
  list: (
    input: AutomationScope & { limit: number; offset: number },
  ) => Promise<AutomationRunList>;
};
