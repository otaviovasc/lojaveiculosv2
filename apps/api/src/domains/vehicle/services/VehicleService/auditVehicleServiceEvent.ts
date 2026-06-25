import type {
  AuditEntityReference,
  AuditFailureTier,
  AuditFieldChange,
  AuditOutcome,
  SafeAuditMetadata,
} from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../../shared/serviceContext.js";

export async function auditVehicleServiceEvent(
  context: ServiceContext,
  input: {
    action: string;
    category: "data_access" | "data_change";
    changes?: readonly AuditFieldChange[];
    entityId: string;
    entityType?:
      | "vehicle_acquisition"
      | "vehicle_checklist"
      | "vehicle_document"
      | "vehicle_listing"
      | "vehicle_media"
      | "vehicle_operation"
      | "vehicle_sale"
      | "vehicle_supplier"
      | "vehicle_unit";
    failureTier?: AuditFailureTier;
    metadata?: SafeAuditMetadata;
    outcome?: AuditOutcome;
    permission: PermissionKey;
    relatedEntities?: readonly AuditEntityReference[];
    summary: string;
  },
): Promise<void> {
  const failureTier = input.failureTier ?? context.auditFailureTier;
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: input.category,
    entityId: input.entityId,
    entityType: input.entityType ?? "vehicle_listing",
    metadata: { permission: input.permission, ...(input.metadata ?? {}) },
    outcome: input.outcome ?? "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: input.summary,
    tenantId: context.tenantId,
    ...(failureTier ? { failureTier } : {}),
    ...(input.changes ? { changes: input.changes } : {}),
    ...(input.relatedEntities
      ? { relatedEntities: input.relatedEntities }
      : {}),
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context.request ? { request: context.request } : {}),
    ...(context.source ? { source: context.source } : {}),
  });
}
