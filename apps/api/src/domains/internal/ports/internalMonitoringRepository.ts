export type InternalAuditEvent = {
  action: string;
  actorId: string;
  actorKind: string;
  category: string | null;
  criticality: string;
  entityId: string;
  entityType: string;
  id: string;
  occurredAt: Date;
  outcome: string;
  requestId: string;
  severity: string;
  storeId: string | null;
  summary: string | null;
  tenantId: string | null;
};

export type InternalAuditSinkFailure = {
  attempts: number;
  createdAt: Date;
  failureTier: string;
  id: string;
  lastError: string;
  requestId: string;
  resolvedAt: Date | null;
  sinkName: string;
};

export type InternalHealthSummary = {
  criticalEvents: number;
  failedEvents: number;
  openSinkFailures: number;
  recentEvents: number;
};

export type InternalHealthSnapshot = {
  events: readonly InternalAuditEvent[];
  failures: readonly InternalAuditSinkFailure[];
  generatedAt: Date;
  summary: InternalHealthSummary;
};

export type InternalMonitoringRepository = {
  getHealthSnapshot: (input: {
    limit: number;
    storeId: string;
    tenantId: string;
  }) => Promise<InternalHealthSnapshot>;
};
