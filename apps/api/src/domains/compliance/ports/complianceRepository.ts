export type ComplianceControlStatus = "attention" | "blocked" | "ok";

export type ComplianceControl = {
  description: string;
  key: string;
  owner: string;
  status: ComplianceControlStatus;
  title: string;
};

export type ComplianceWorkflow = {
  description: string;
  key: string;
  lastRunAt: Date | null;
  nextDueAt: Date | null;
  status: ComplianceControlStatus;
  title: string;
};

export type ComplianceSnapshot = {
  controls: readonly ComplianceControl[];
  generatedAt: Date;
  score: number;
  storeId: string;
  summary: {
    attention: number;
    blocked: number;
    ok: number;
  };
  tenantId: string;
  workflows: readonly ComplianceWorkflow[];
};

export type ComplianceRepository = {
  getSnapshot: (input: {
    storeId: string;
    tenantId: string;
  }) => Promise<ComplianceSnapshot>;
};
