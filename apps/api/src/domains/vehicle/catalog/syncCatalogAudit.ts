import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { VehicleCatalogType } from "../ports/vehicleCatalogProvider.js";
import type { CatalogSyncCounts } from "./syncCatalogSupport.js";

type AuditRecord = ServiceContext["audit"]["record"];

export async function auditSync(
  recordAudit: AuditRecord,
  context: ServiceContext,
  vehicleType: VehicleCatalogType,
  runId: string,
  counts: CatalogSyncCounts,
  metadata: Record<string, unknown>,
  permission: string,
): Promise<void> {
  await recordAudit({
    action: "vehicle_catalog.sync",
    actor: context.actor,
    category: "data_change",
    entityId: runId,
    entityType: "vehicle_catalog",
    metadata: {
      ...counts,
      ...metadata,
      permission,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: `Synced FIPE catalog for ${vehicleType}`,
    tenantId: context.tenantId,
  });
}

export async function auditSyncFailure(
  recordAudit: AuditRecord,
  context: ServiceContext,
  vehicleType: VehicleCatalogType,
  runId: string,
  counts: CatalogSyncCounts,
  errorMessage: string,
  permission: string,
): Promise<void> {
  await recordAudit({
    action: "vehicle_catalog.sync",
    actor: context.actor,
    category: "data_change",
    entityId: runId,
    entityType: "vehicle_catalog",
    metadata: {
      ...counts,
      errorMessage,
      permission,
    },
    outcome: "failed",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: `Failed FIPE catalog sync for ${vehicleType}`,
    tenantId: context.tenantId,
  });
}
