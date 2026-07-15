import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { auditEvents } from "@lojaveiculosv2/audit-db";
import type * as auditSchema from "@lojaveiculosv2/audit-db";
import type {
  VehicleAuditEvent,
  VehicleAuditRepository,
} from "../../../domains/vehicle/ports/vehicleAuditRepository.js";

export type DrizzleVehicleAuditClient = PostgresJsDatabase<typeof auditSchema>;

export function createDrizzleVehicleAuditRepository(
  db: DrizzleVehicleAuditClient,
): VehicleAuditRepository {
  return {
    async listByEntityIds(input) {
      if (input.entityIds.length === 0) return [];
      const rows = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.storeId, input.storeId),
            eq(auditEvents.tenantId, input.tenantId),
            or(
              inArray(auditEvents.entityId, [...input.entityIds]),
              sql`exists (
                select 1
                from jsonb_array_elements(${auditEvents.relatedEntities}) as related_entity
                where ${inArray(sql<string>`related_entity ->> 'id'`, [
                  ...input.entityIds,
                ])}
              )`,
            ),
            ne(auditEvents.action, "vehicle_listing.audit.read"),
          ),
        )
        .orderBy(desc(auditEvents.occurredAt))
        .limit(Math.min(Math.max(input.limit, 1), 100));

      return rows.map(toVehicleAuditEvent);
    },
  };
}

function toVehicleAuditEvent(
  row: typeof auditEvents.$inferSelect,
): VehicleAuditEvent {
  return {
    action: row.action,
    actorId: row.actorId,
    actorKind: row.actorKind,
    category: row.category,
    changes: toAuditChanges(row.changes),
    id: row.id,
    occurredAt: row.occurredAt,
    outcome: row.outcome,
    providerName: row.providerName,
    summary: row.summary,
  };
}

function toAuditChanges(value: unknown): VehicleAuditEvent["changes"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((change) => {
    if (!isRecord(change) || typeof change.path !== "string") return [];
    return [{ path: change.path }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
