import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleChecklistOverview } from "../../readModels/vehicleChecklistOverview.js";
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

export async function listVehicleChecklistOverview(
  context: ServiceContext,
  input: VehicleChecklistOverviewInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleChecklistOverview> {
  assertPermission(context, permission);
  const overview = await loadVehicleChecklistOverview(context, input, ports);
  const metadata = {
    itemCount: overview.summary.itemCount,
    scope: input.scope ?? "active",
    status: input.status ?? "all",
    unitCount: overview.summary.unitCount,
  };
  logVehicleServiceEvent(context, "vehicle_checklist.overview.read", metadata);
  await auditVehicleServiceEvent(context, {
    action: "vehicle_checklist.overview.read",
    category: "data_access",
    entityId: `vehicle_checklists:${context.storeId ?? "unscoped"}`,
    metadata,
    permission,
    summary: "Listed vehicle checklist overview",
  });
  return overview;
}

export type { VehicleChecklistOverviewInput };
