import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { auditEvents, auditSinkFailures } from "@lojaveiculosv2/audit-db";
import type * as auditSchema from "@lojaveiculosv2/audit-db";
import type {
  InternalAuditEvent,
  InternalAuditSinkFailure,
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
      const limit = Math.min(Math.max(input.limit, 1), 100);
      const events = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.storeId, input.storeId),
            eq(auditEvents.tenantId, input.tenantId),
          ),
        )
        .orderBy(desc(auditEvents.occurredAt))
        .limit(limit);
      const failures = await listScopedFailures(db, events, limit);

      return createInternalHealthSnapshot(
        events.map(toEvent),
        failures.map(toFailure),
      );
    },
  };
}

async function listScopedFailures(
  db: DrizzleInternalMonitoringClient,
  events: (typeof auditEvents.$inferSelect)[],
  limit: number,
) {
  if (!events.length) return [];
  return db
    .select()
    .from(auditSinkFailures)
    .where(
      and(
        isNull(auditSinkFailures.resolvedAt),
        or(
          inArray(
            auditSinkFailures.eventId,
            events.map((event) => event.id),
          ),
          inArray(
            auditSinkFailures.requestId,
            events.map((event) => event.requestId),
          ),
        ),
      ),
    )
    .orderBy(desc(auditSinkFailures.createdAt))
    .limit(limit);
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
