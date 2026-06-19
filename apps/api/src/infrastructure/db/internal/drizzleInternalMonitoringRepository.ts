import { and, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { auditEvents, auditSinkFailures } from "@lojaveiculosv2/audit-db";
import type * as auditSchema from "@lojaveiculosv2/audit-db";
import type {
  InternalAuditEvent,
  InternalAuditSinkFailure,
  InternalHealthSnapshot,
  InternalMonitoringRepository,
} from "../../../domains/internal/ports/internalMonitoringRepository.js";

export type DrizzleInternalMonitoringClient = PostgresJsDatabase<
  typeof auditSchema
>;

export function createDrizzleInternalMonitoringRepository(
  db: DrizzleInternalMonitoringClient,
): InternalMonitoringRepository {
  return {
    async getHealthSnapshot(input) {
      const limit = Math.min(Math.max(input.limit, 1), 100);
      const [events, failures] = await Promise.all([
        db
          .select()
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.storeId, input.storeId),
              eq(auditEvents.tenantId, input.tenantId),
            ),
          )
          .orderBy(desc(auditEvents.occurredAt))
          .limit(limit),
        db
          .select()
          .from(auditSinkFailures)
          .where(isNull(auditSinkFailures.resolvedAt))
          .orderBy(desc(auditSinkFailures.createdAt))
          .limit(limit),
      ]);

      return toSnapshot(events.map(toEvent), failures.map(toFailure));
    },
  };
}

function toSnapshot(
  events: InternalAuditEvent[],
  failures: InternalAuditSinkFailure[],
): InternalHealthSnapshot {
  return {
    events,
    failures,
    generatedAt: new Date(),
    summary: {
      criticalEvents: events.filter((event) => event.criticality === "critical")
        .length,
      failedEvents: events.filter((event) => event.outcome === "failed").length,
      openSinkFailures: failures.length,
      recentEvents: events.length,
    },
  };
}

function toEvent(row: typeof auditEvents.$inferSelect): InternalAuditEvent {
  return {
    action: row.action,
    actorId: row.actorId,
    actorKind: row.actorKind,
    category: row.category,
    criticality: row.criticality,
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    occurredAt: row.occurredAt,
    outcome: row.outcome,
    requestId: row.requestId,
    severity: row.severity,
    storeId: row.storeId,
    summary: row.summary,
    tenantId: row.tenantId,
  };
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
