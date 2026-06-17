import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import { auditEvents } from "@lojaveiculosv2/audit-db";
import type { InferInsertModel } from "drizzle-orm";

type InsertAuditEventRow = InferInsertModel<typeof auditEvents>;

type InsertValuesBuilder = {
  values: (record: InsertAuditEventRow) => Promise<unknown>;
};

export type DrizzleAuditSinkClient = {
  insert: (table: unknown) => InsertValuesBuilder;
};

export function createDrizzleAuditSink(db: DrizzleAuditSinkClient): AuditSink {
  return {
    async record(event) {
      await db.insert(auditEvents).values(toAuditEventRow(event));
    },
  };
}

function toAuditEventRow(event: AuditEvent): InsertAuditEventRow {
  const row: InsertAuditEventRow = {
    action: event.action,
    actorId: event.actor.id,
    actorKind: event.actor.kind,
    category: event.category ?? null,
    changes: event.changes ? [...event.changes] : [],
    correlationId: event.correlationId ?? event.request?.correlationId ?? null,
    criticality: event.criticality ?? "low",
    dataClassification: event.dataClassification ?? "internal",
    entityId: event.entityId,
    entityType: event.entityType,
    failureTier: event.failureTier ?? "best_effort",
    metadata: event.metadata ?? {},
    outcome: event.outcome ?? "succeeded",
    providerEventId: event.provider?.eventId ?? null,
    providerName: event.provider?.name ?? null,
    relatedEntities: event.relatedEntities ? [...event.relatedEntities] : [],
    requestContext: event.request ?? {},
    requestId: event.requestId,
    schemaVersion: event.schemaVersion ?? 1,
    severity: event.severity ?? "info",
    source: event.source ?? {},
    storeId: event.storeId,
    summary: event.summary ?? null,
    tags: event.tags ? [...event.tags] : [],
    target: event.target ?? {},
    tenantId: event.tenantId,
  };

  if (event.occurredAt) row.occurredAt = new Date(event.occurredAt);

  return row;
}
