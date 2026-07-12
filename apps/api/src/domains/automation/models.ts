import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type AutomationRunStatus =
  "awaiting_approval" | "approved" | "rejected" | "cancelled";

export type AutomationStepStatus = AutomationRunStatus;
export type AutomationApprovalStatus =
  "pending" | "approved" | "rejected" | "cancelled";
export type AutomationStepKind = "read_only_preview";
export type AutomationRisk = "low";

export type AutomationRunContext = {
  module?: string | undefined;
  resourceId?: string | undefined;
};

export type AutomationApproval = {
  createdAt: Date;
  decidedAt: Date | null;
  decidedByActorId: string | null;
  id: string;
  proposalDigest: string;
  status: AutomationApprovalStatus;
  updatedAt: Date;
  version: number;
};

export type AutomationStep = {
  approval: AutomationApproval | null;
  createdAt: Date;
  executionEnabled: false;
  id: string;
  kind: AutomationStepKind;
  position: number;
  risk: AutomationRisk;
  status: AutomationStepStatus;
  summary: string;
  title: string;
  updatedAt: Date;
  version: number;
};

export type AutomationRun = {
  context: AutomationRunContext;
  createdAt: Date;
  createdByActorId: string;
  executionEnabled: false;
  id: string;
  objective: string;
  status: AutomationRunStatus;
  steps: AutomationStep[];
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
  version: number;
};

export type AutomationRunSummary = Omit<AutomationRun, "context" | "steps"> & {
  pendingApprovalCount: number;
  stepCount: number;
};

export type AutomationRunList = {
  items: AutomationRunSummary[];
  limit: number;
  offset: number;
  total: number;
};
