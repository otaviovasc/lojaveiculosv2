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
  deniedEvents: number;
  failedEvents: number;
  openSinkFailures: number;
  recentEvents: number;
  uniqueActors: number;
  warningEvents: number;
};

export type InternalHealthStatus = "critical" | "healthy" | "warning";

export type InternalHealthAlert = {
  count: number;
  key: string;
  message: string;
  severity: InternalHealthStatus;
};

export type InternalActionMetric = {
  action: string;
  criticalCount: number;
  deniedCount: number;
  failedCount: number;
  lastOccurredAt: Date;
  total: number;
};

export type InternalBreakdownMetric = {
  key: string;
  total: number;
};

export type InternalActorMetric = {
  actorId: string;
  actorKind: string;
  deniedCount: number;
  failedCount: number;
  lastSeenAt: Date;
  total: number;
};

export type InternalSinkMetric = {
  failureTier: string;
  firstFailureAt: Date;
  openFailures: number;
  sinkName: string;
  totalAttempts: number;
};

export type InternalHealthSnapshot = {
  actionMetrics: readonly InternalActionMetric[];
  actorMetrics: readonly InternalActorMetric[];
  alerts: readonly InternalHealthAlert[];
  categoryMetrics: readonly InternalBreakdownMetric[];
  events: readonly InternalAuditEvent[];
  failures: readonly InternalAuditSinkFailure[];
  generatedAt: Date;
  outcomeMetrics: readonly InternalBreakdownMetric[];
  severityMetrics: readonly InternalBreakdownMetric[];
  sinkMetrics: readonly InternalSinkMetric[];
  status: InternalHealthStatus;
  summary: InternalHealthSummary;
};

export type InternalMonitoringRepository = {
  getHealthSnapshot: (input: {
    limit: number;
    storeId: string;
    tenantId: string;
  }) => Promise<InternalHealthSnapshot>;
};
