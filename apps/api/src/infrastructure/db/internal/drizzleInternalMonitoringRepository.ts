import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { auditEvents, auditSinkFailures } from "@lojaveiculosv2/audit-db";
import type * as auditSchema from "@lojaveiculosv2/audit-db";
import type {
  AuditSource,
  SafeAuditMetadata,
  SafeAuditMetadataValue,
} from "@lojaveiculosv2/audit";
import type {
  InternalAuditEvent,
  InternalAuditRequestContext,
  InternalAuditSinkFailure,
  InternalMonitoringQuery,
  InternalMonitoringRepository,
} from "../../../domains/internal/ports/internalMonitoringRepository.js";
import { createInternalHealthSnapshot } from "./internalMonitoringSnapshot.js";

export type DrizzleInternalMonitoringClient = PostgresJsDatabase<
  typeof auditSchema
>;

export function createDrizzleInternalMonitoringRepository(
  db: DrizzleInternalMonitoringClient,
): InternalMonitoringRepository {
  return {
    async getHealthSnapshot(input) {
      return readHealthSnapshot(db, input.query, [
        eq(auditEvents.storeId, input.storeId),
        eq(auditEvents.tenantId, input.tenantId),
      ]);
    },
    async getPlatformHealthSnapshot(input) {
      return readHealthSnapshot(db, input.query, []);
    },
  };
}

async function readHealthSnapshot(
  db: DrizzleInternalMonitoringClient,
  query: InternalMonitoringQuery,
  conditions: SQL[],
): Promise<ReturnType<typeof createInternalHealthSnapshot>> {
  const limit = Math.min(Math.max(query.limit, 1), 100);
  addQueryConditions(conditions, query);
  const events = await db
    .select()
    .from(auditEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditEvents.occurredAt))
    .limit(limit);
  const failures = await listScopedFailures(db, events, limit, query);

  return createInternalHealthSnapshot(
    events.map(toEvent),
    failures.map(toFailure),
  );
}

function addQueryConditions(
  conditions: SQL[],
  query: InternalMonitoringQuery,
): void {
  if (query.action) conditions.push(eq(auditEvents.action, query.action));
  if (query.actorId) conditions.push(eq(auditEvents.actorId, query.actorId));
  if (query.category) conditions.push(eq(auditEvents.category, query.category));
  if (query.correlationId)
    conditions.push(eq(auditEvents.correlationId, query.correlationId));
  if (query.criticality)
    conditions.push(eq(auditEvents.criticality, query.criticality));
  if (query.entityId) conditions.push(eq(auditEvents.entityId, query.entityId));
  if (query.entityType)
    conditions.push(eq(auditEvents.entityType, query.entityType));
  if (query.from) conditions.push(gte(auditEvents.occurredAt, query.from));
  if (query.outcome) conditions.push(eq(auditEvents.outcome, query.outcome));
  if (query.providerName)
    conditions.push(eq(auditEvents.providerName, query.providerName));
  if (query.requestId)
    conditions.push(eq(auditEvents.requestId, query.requestId));
  if (query.severity) conditions.push(eq(auditEvents.severity, query.severity));
  if (query.to) conditions.push(lte(auditEvents.occurredAt, query.to));
}

async function listScopedFailures(
  db: DrizzleInternalMonitoringClient,
  events: (typeof auditEvents.$inferSelect)[],
  limit: number,
  query: InternalMonitoringQuery,
) {
  const eventIds = events.map((event) => event.id);
  const requestIds = [
    ...new Set([
      ...events.map((event) => event.requestId),
      ...(query.requestId ? [query.requestId] : []),
    ]),
  ];
  const identifiers = [
    ...(eventIds.length ? [inArray(auditSinkFailures.eventId, eventIds)] : []),
    ...(requestIds.length
      ? [inArray(auditSinkFailures.requestId, requestIds)]
      : []),
  ];
  if (!identifiers.length) return [];
  return db
    .select()
    .from(auditSinkFailures)
    .where(and(isNull(auditSinkFailures.resolvedAt), or(...identifiers)))
    .orderBy(desc(auditSinkFailures.createdAt))
    .limit(limit);
}

function toEvent(row: typeof auditEvents.$inferSelect): InternalAuditEvent {
  return {
    action: row.action,
    actorId: row.actorId,
    actorKind: row.actorKind,
    category: row.category,
    correlationId: row.correlationId,
    criticality: row.criticality,
    entityId: row.entityId,
    entityType: row.entityType,
    failureTier: row.failureTier,
    id: row.id,
    occurredAt: row.occurredAt,
    outcome: row.outcome,
    providerEventId: row.providerEventId,
    providerName: row.providerName,
    metadata: toSafeAuditMetadata(row.metadata),
    requestContext: toRequestContext(row.requestContext),
    requestId: row.requestId,
    severity: row.severity,
    source: toAuditSource(row.source),
    storeId: row.storeId,
    summary: row.summary,
    tags: toTags(row.tags),
    tenantId: row.tenantId,
  };
}

function toSafeAuditMetadata(value: unknown): SafeAuditMetadata {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).flatMap(([key, entryValue]) => {
    const safeValue = toSafeAuditMetadataValue(entryValue);
    return safeValue === undefined ? [] : [[key, safeValue] as const];
  });
  return Object.fromEntries(entries);
}

function toSafeAuditMetadataValue(
  value: unknown,
): SafeAuditMetadataValue | undefined {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    const safeValues = value.flatMap((item) => {
      const safeValue = toSafeAuditMetadataValue(item);
      return safeValue === undefined ? [] : [safeValue];
    });
    return safeValues;
  }
  if (!isRecord(value)) return undefined;
  return toSafeAuditMetadata(value);
}

function toRequestContext(value: unknown): InternalAuditRequestContext | null {
  if (!isRecord(value) || typeof value.requestId !== "string") return null;
  return {
    requestId: value.requestId,
    ...(typeof value.causationId === "string"
      ? { causationId: value.causationId }
      : {}),
    ...(typeof value.correlationId === "string"
      ? { correlationId: value.correlationId }
      : {}),
    ...(typeof value.method === "string" ? { method: value.method } : {}),
    ...(typeof value.path === "string" ? { path: value.path } : {}),
  } satisfies InternalAuditRequestContext;
}

function toAuditSource(value: unknown): AuditSource | null {
  if (!isRecord(value) || typeof value.service !== "string") return null;
  return {
    service: value.service,
    ...(typeof value.component === "string"
      ? { component: value.component }
      : {}),
    ...(typeof value.environment === "string"
      ? { environment: value.environment }
      : {}),
    ...(typeof value.region === "string" ? { region: value.region } : {}),
    ...(typeof value.version === "string" ? { version: value.version } : {}),
  } satisfies AuditSource;
}

function toTags(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFailure(
  row: typeof auditSinkFailures.$inferSelect,
): InternalAuditSinkFailure {
  return {
    attempts: row.attempts,
    createdAt: row.createdAt,
    failureTier: row.failureTier,
    id: row.id,
    lastError: row.lastError,
    requestId: row.requestId,
    resolvedAt: row.resolvedAt,
    sinkName: row.sinkName,
  };
}
