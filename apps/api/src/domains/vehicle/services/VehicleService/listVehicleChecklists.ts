import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { VehicleChecklist } from "../../ports/vehicleChecklistRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnitById,
  getChecklistRepository,
  getListingRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.checklist_read";

export type ListVehicleChecklistsInput = {
  unitId: string;
};

export async function listVehicleChecklists(
  context: ServiceContext,
  input: ListVehicleChecklistsInput,
  ports?: VehicleInventoryServicePorts,
): Promise<readonly VehicleChecklist[]> {
  assertPermission(context, permission);
  const unit = await findScopedUnitById(
    context,
    getUnitRepository(ports),
    input.unitId,
  );
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    unit.listingId,
  );
  const checklists = await getChecklistRepository(ports).listByUnitIds({
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitIds: [unit.id],
  });

  logVehicleServiceEvent(context, "vehicle_checklist.list.read", {
    checklistCount: checklists.length,
    listingId: listing.id,
    unitId: unit.id,
  });

  await auditVehicleServiceEvent(context, {
    action: "vehicle_checklist.list.read",
    category: "data_access",
    entityId: unit.id,
    entityType: "vehicle_unit",
    metadata: { checklistCount: checklists.length },
    permission,
    relatedEntities: [{ id: listing.id, type: "vehicle_listing" }],
    summary: "Listed vehicle checklists",
  });

  return checklists;
}
