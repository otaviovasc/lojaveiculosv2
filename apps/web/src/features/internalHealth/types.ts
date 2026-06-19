export type InternalHealthAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type InternalAuditEvent = {
  action: string;
  actorId: string;
  actorKind: string;
  category: string | null;
  criticality: string;
  entityId: string;
  entityType: string;
  id: string;
  occurredAt: string;
  outcome: string;
  requestId: string;
  severity: string;
  storeId: string | null;
  summary: string | null;
  tenantId: string | null;
};

export type InternalAuditSinkFailure = {
  attempts: number;
  createdAt: string;
  failureTier: string;
  id: string;
  lastError: string;
  requestId: string;
  resolvedAt: string | null;
  sinkName: string;
};

export type InternalHealthSnapshot = {
  events: InternalAuditEvent[];
  failures: InternalAuditSinkFailure[];
  generatedAt: string;
  summary: {
    criticalEvents: number;
    failedEvents: number;
    openSinkFailures: number;
    recentEvents: number;
  };
};
