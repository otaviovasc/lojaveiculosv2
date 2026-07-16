import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { renderVehicleChecklistReportPdf } from "../../documents/vehicleChecklistReportPdf.js";
import { getVehicleWorkflowStoreBranding } from "../../documents/vehicleWorkflowStoreBranding.js";
import {
  auditVehicleServiceEvent,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import {
  loadVehicleChecklistOverview,
  type VehicleChecklistOverviewInput,
} from "../../checklists/vehicleChecklistOverviewLoader.js";

const permission = "inventory.checklist_read";

export type VehicleChecklistReport = {
  bytes: Uint8Array;
  fileName: string;
};

export async function exportVehicleChecklistReport(
  context: ServiceContext,
  input: VehicleChecklistOverviewInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleChecklistReport> {
  assertPermission(context, permission);
  const overview = await loadVehicleChecklistOverview(context, input, ports);
  const branding = await getVehicleWorkflowStoreBranding(context, ports);
  const unitReport = Boolean(input.unitId);
  const bytes = await renderVehicleChecklistReportPdf({
    branding,
    overview,
    scopeLabel: scopeLabel(input.scope ?? "active"),
    unitReport,
  });
  const metadata = {
    byteCount: bytes.byteLength,
    scope: input.scope ?? "active",
    unitCount: overview.summary.unitCount,
    unitReport,
  };
  logVehicleServiceEvent(
    context,
    "vehicle_checklist.report.exported",
    metadata,
  );
  await auditVehicleServiceEvent(context, {
    action: "vehicle_checklist.report.exported",
    category: "data_access",
    entityId:
      input.unitId ?? `vehicle_checklists:${context.storeId ?? "unscoped"}`,
    ...(input.unitId ? { entityType: "vehicle_unit" as const } : {}),
    metadata,
    permission,
    summary: "Exported vehicle checklist PDF report",
  });
  return {
    bytes,
    fileName: unitReport
      ? `checklist-veiculo-${dateStamp()}.pdf`
      : `checklists-geral-${dateStamp()}.pdf`,
  };
}

function scopeLabel(
  scope: NonNullable<VehicleChecklistOverviewInput["scope"]>,
) {
  return {
    active: "Estoque ativo",
    all: "Todos os veículos",
    completed: "Vendidos e entregues",
  }[scope];
}

function dateStamp() {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}
