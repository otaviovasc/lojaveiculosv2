export type InternalHealthAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type InternalHealthStatus = "critical" | "healthy" | "warning";

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
  lastOccurredAt: string;
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
  lastSeenAt: string;
  total: number;
};

export type InternalSinkMetric = {
  failureTier: string;
  firstFailureAt: string;
  openFailures: number;
  sinkName: string;
  totalAttempts: number;
};

export type InternalHealthSnapshot = {
  actionMetrics: InternalActionMetric[];
  actorMetrics: InternalActorMetric[];
  alerts: InternalHealthAlert[];
  categoryMetrics: InternalBreakdownMetric[];
  events: InternalAuditEvent[];
  failures: InternalAuditSinkFailure[];
  generatedAt: string;
  outcomeMetrics: InternalBreakdownMetric[];
  severityMetrics: InternalBreakdownMetric[];
  sinkMetrics: InternalSinkMetric[];
  status: InternalHealthStatus;
  summary: {
    criticalEvents: number;
    deniedEvents: number;
    failedEvents: number;
    openSinkFailures: number;
    recentEvents: number;
    uniqueActors: number;
    warningEvents: number;
  };
};
