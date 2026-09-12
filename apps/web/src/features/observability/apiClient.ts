import { readApiJson } from "../../lib/apiErrors";
import {
  createRuntimeAuthHeaders,
  createRuntimeFetch,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";

export type ObservabilityQuery = {
  action?: string;
  actorId?: string;
  category?: string;
  correlationId?: string;
  criticality?: string;
  entityId?: string;
  entityType?: string;
  from?: string;
  limit: number;
  outcome?: string;
  providerName?: string;
  requestId?: string;
  severity?: string;
  to?: string;
};

export type ObservabilityFilterState = ObservabilityQuery;
export type ObservabilityNotice = {
  message: string;
  tone: "info" | "success" | "danger";
};

export type ObservabilityEvent = {
  action: string;
  actorId: string;
  actorKind: string;
  category: string | null;
  correlationId: string | null;
  criticality: string;
  entityId: string;
  entityType: string;
  failureTier: string;
  id: string;
  occurredAt: string;
  outcome: string;
  providerEventId: string | null;
  providerName: string | null;
  metadata: Record<string, unknown>;
  requestContext: {
    causationId: string | null;
    correlationId: string | null;
    method: string;
    path: string;
    requestId: string;
  } | null;
  requestId: string;
  severity: string;
  source: Record<string, unknown> | null;
  storeId: string | null;
  summary: string | null;
  tags: readonly string[];
  tenantId: string | null;
};

export type ObservabilitySnapshot = {
  actionMetrics: readonly {
    action: string;
    criticalCount: number;
    deniedCount: number;
    failedCount: number;
    lastOccurredAt: string;
    total: number;
  }[];
  actorMetrics: readonly {
    actorId: string;
    actorKind: string;
    deniedCount: number;
    failedCount: number;
    lastSeenAt: string;
    total: number;
  }[];
  alerts: readonly {
    count: number;
    key: string;
    message: string;
    severity: "critical" | "healthy" | "warning";
  }[];
  categoryMetrics: readonly { key: string; total: number }[];
  events: readonly ObservabilityEvent[];
  failures: readonly {
    attempts: number;
    createdAt: string;
    failureTier: string;
    id: string;
    lastError: string;
    requestId: string;
    resolvedAt: string | null;
    sinkName: string;
  }[];
  generatedAt: string;
  outcomeMetrics: readonly { key: string; total: number }[];
  severityMetrics: readonly { key: string; total: number }[];
  sinkMetrics: readonly {
    failureTier: string;
    firstFailureAt: string;
    openFailures: number;
    sinkName: string;
    totalAttempts: number;
  }[];
  status: "critical" | "healthy" | "warning";
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

export type ObservabilityApi = {
  getHealth: (query: ObservabilityQuery) => Promise<ObservabilitySnapshot>;
};

export async function createRuntimeObservabilityApi(): Promise<ObservabilityApi> {
  return createObservabilityApi({
    fetch: createRuntimeFetch(),
    headers: await createRuntimeAuthHeaders({ includeStoreSlug: false }),
    ...readRuntimeApiBaseUrl(),
  });
}

export function createObservabilityApi(input: {
  baseUrl?: string;
  fetch: typeof fetch;
  headers?: HeadersInit;
}): ObservabilityApi {
  return {
    getHealth: (query) =>
      input
        .fetch(
          observabilityHealthEndpoint(input.baseUrl, query),
          input.headers ? { headers: input.headers } : undefined,
        )
        .then((response) =>
          readApiJson<ObservabilitySnapshot>(response, {
            endpoint: "/api/v1/internal/platform/health",
            feature: "Observabilidade",
          }),
        ),
  };
}

function observabilityHealthEndpoint(
  baseUrl: string | undefined,
  query: ObservabilityQuery,
) {
  const endpoint = `${createEndpoint("/internal/platform/health", baseUrl)}?`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return `${endpoint}${params.toString()}`;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
