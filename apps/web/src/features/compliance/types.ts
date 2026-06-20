export type ComplianceAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type ComplianceStatus = "attention" | "blocked" | "ok";

export type ComplianceSnapshot = {
  controls: readonly {
    description: string;
    key: string;
    owner: string;
    status: ComplianceStatus;
    title: string;
  }[];
  generatedAt: string;
  score: number;
  summary: {
    attention: number;
    blocked: number;
    ok: number;
  };
  workflows: readonly {
    description: string;
    key: string;
    lastRunAt: string | null;
    nextDueAt: string | null;
    status: ComplianceStatus;
    title: string;
  }[];
};
