export type AutomationRunStatus =
  "awaiting_approval" | "approved" | "rejected" | "cancelled";

export type AutomationStepStatus = AutomationRunStatus;
export type AutomationApprovalStatus =
  "pending" | "approved" | "rejected" | "cancelled";

export type AutomationRunSummary = {
  createdAt: string;
  createdByActorId: string;
  executionEnabled: false;
  id: string;
  objective: string;
  pendingApprovalCount: number;
  status: AutomationRunStatus;
  stepCount: number;
  updatedAt: string;
  version: number;
};

export type AutomationStepApproval = {
  createdAt: string;
  decidedAt: string | null;
  decidedByActorId: string | null;
  id: string;
  proposalDigest: string;
  status: AutomationApprovalStatus;
  updatedAt: string;
  version: number;
};

export type AutomationRunStep = {
  approval: AutomationStepApproval | null;
  createdAt: string;
  executionEnabled: false;
  id: string;
  kind: "read_only_preview";
  position: number;
  risk: "low";
  status: AutomationStepStatus;
  summary: string;
  title: string;
  updatedAt: string;
  version: number;
};

export type AutomationRun = {
  context: {
    module?: string;
    resourceId?: string;
  };
  createdAt: string;
  createdByActorId: string;
  executionEnabled: false;
  id: string;
  objective: string;
  pendingApprovalCount: number;
  status: AutomationRunStatus;
  steps: AutomationRunStep[];
  stepCount: number;
  updatedAt: string;
  version: number;
};

export type CreateAutomationRunInput = {
  context?: {
    module?: string;
    resourceId?: string;
  };
  objective: string;
};

export type AutomationDecisionInput = {
  expectedApprovalVersion: number;
  expectedProposalDigest: string;
  expectedRunVersion: number;
  expectedStepVersion: number;
  runId: string;
  stepId: string;
};

export type AutomationRunList = {
  data: AutomationRunSummary[];
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type AutomationMobilePane = "queue" | "preview" | "details";
export type AutomationPendingDecision =
  | {
      kind: "approve" | "reject";
      step: AutomationRunStep;
    }
  | {
      kind: "cancel";
      step: null;
    }
  | null;
