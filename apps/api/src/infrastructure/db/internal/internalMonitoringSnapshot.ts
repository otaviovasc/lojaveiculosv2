import type {
  InternalActionMetric,
  InternalActorMetric,
  InternalAuditEvent,
  InternalAuditSinkFailure,
  InternalBreakdownMetric,
  InternalHealthAlert,
  InternalHealthSnapshot,
  InternalHealthStatus,
  InternalSinkMetric,
} from "../../../domains/internal/ports/internalMonitoringRepository.js";

export function createInternalHealthSnapshot(
  events: InternalAuditEvent[],
  failures: InternalAuditSinkFailure[],
): InternalHealthSnapshot {
  const summary = createSummary(events, failures);
  return {
    actionMetrics: createActionMetrics(events),
    actorMetrics: createActorMetrics(events),
    alerts: createAlerts(summary, failures),
    categoryMetrics: createBreakdown(
      events,
      (event) => event.category ?? "uncategorized",
    ),
    events,
    failures,
    generatedAt: new Date(),
    outcomeMetrics: createBreakdown(events, (event) => event.outcome),
    severityMetrics: createBreakdown(events, (event) => event.severity),
    sinkMetrics: createSinkMetrics(failures),
    status: createStatus(summary, failures),
    summary,
  };
}

function createSummary(
  events: InternalAuditEvent[],
  failures: InternalAuditSinkFailure[],
) {
  return {
    criticalEvents: events.filter((event) => event.criticality === "critical")
      .length,
    deniedEvents: events.filter((event) => event.outcome === "denied").length,
    failedEvents: events.filter((event) => event.outcome === "failed").length,
    openSinkFailures: failures.length,
    recentEvents: events.length,
    uniqueActors: new Set(
      events.map((event) => `${event.actorKind}:${event.actorId}`),
    ).size,
    warningEvents: events.filter((event) => event.severity === "warning")
      .length,
  };
}

function createStatus(
  summary: ReturnType<typeof createSummary>,
  failures: InternalAuditSinkFailure[],
): InternalHealthStatus {
  if (
    summary.criticalEvents > 0 ||
    summary.failedEvents > 0 ||
    failures.some((failure) => failure.failureTier === "required")
  ) {
    return "critical";
  }
  if (
    summary.deniedEvents > 0 ||
    summary.openSinkFailures > 0 ||
    summary.warningEvents > 0
  ) {
    return "warning";
  }
  return "healthy";
}

function createAlerts(
  summary: ReturnType<typeof createSummary>,
  failures: InternalAuditSinkFailure[],
): InternalHealthAlert[] {
  const alerts: InternalHealthAlert[] = [];
  if (summary.failedEvents) {
    alerts.push(alert("failed-events", "critical", summary.failedEvents));
  }
  const requiredFailures = failures.filter(
    (failure) => failure.failureTier === "required",
  ).length;
  if (requiredFailures) {
    alerts.push(alert("required-sink-failures", "critical", requiredFailures));
  }
  if (summary.deniedEvents) {
    alerts.push(alert("denied-events", "warning", summary.deniedEvents));
  }
  return alerts;
}

function alert(
  key: string,
  severity: InternalHealthStatus,
  count: number,
): InternalHealthAlert {
  const messages = {
    "denied-events": "Tentativas negadas recentes indicam revisao de acesso.",
    "failed-events": "Eventos auditados falharam e precisam de triagem.",
    "required-sink-failures":
      "Falhas obrigatorias do audit sink estao abertas.",
  };
  return {
    count,
    key,
    message: messages[key as keyof typeof messages],
    severity,
  };
}

function createActionMetrics(
  events: InternalAuditEvent[],
): InternalActionMetric[] {
  return topMetrics(events, (event) => event.action).map(({ items, key }) => ({
    action: key,
    criticalCount: items.filter((event) => event.criticality === "critical")
      .length,
    deniedCount: items.filter((event) => event.outcome === "denied").length,
    failedCount: items.filter((event) => event.outcome === "failed").length,
    lastOccurredAt: latestEventAt(items),
    total: items.length,
  }));
}

function createActorMetrics(
  events: InternalAuditEvent[],
): InternalActorMetric[] {
  return topMetrics(
    events,
    (event) => `${event.actorKind}:${event.actorId}`,
  ).map(({ items }) => {
    const [first] = items;
    return {
      actorId: first?.actorId ?? "unknown",
      actorKind: first?.actorKind ?? "unknown",
      deniedCount: items.filter((event) => event.outcome === "denied").length,
      failedCount: items.filter((event) => event.outcome === "failed").length,
      lastSeenAt: latestEventAt(items),
      total: items.length,
    };
  });
}

function createBreakdown(
  events: InternalAuditEvent[],
  getKey: (event: InternalAuditEvent) => string,
): InternalBreakdownMetric[] {
  return topMetrics(events, getKey).map(({ items, key }) => ({
    key,
    total: items.length,
  }));
}

function createSinkMetrics(
  failures: InternalAuditSinkFailure[],
): InternalSinkMetric[] {
  return topMetrics(failures, (failure) => failure.sinkName).map(
    ({ items, key }) => ({
      failureTier: highestTier(items.map((item) => item.failureTier)),
      firstFailureAt: oldestFailureAt(items),
      openFailures: items.length,
      sinkName: key,
      totalAttempts: items.reduce((sum, item) => sum + item.attempts, 0),
    }),
  );
}

function topMetrics<Item>(
  items: Item[],
  getKey: (item: Item) => string,
): { items: Item[]; key: string }[] {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([key, groupItems]) => ({ items: groupItems, key }))
    .sort((left, right) => right.items.length - left.items.length)
    .slice(0, 8);
}

function latestEventAt(events: InternalAuditEvent[]) {
  return new Date(
    Math.max(...events.map((event) => event.occurredAt.getTime())),
  );
}

function oldestFailureAt(failures: InternalAuditSinkFailure[]) {
  return new Date(
    Math.min(...failures.map((failure) => failure.createdAt.getTime())),
  );
}

function highestTier(tiers: string[]) {
  if (tiers.includes("required")) return "required";
  if (tiers.includes("important")) return "important";
  return "best_effort";
}
