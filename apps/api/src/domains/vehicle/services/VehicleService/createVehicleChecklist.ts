import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleChecklist,
  VehicleChecklistStatus,
} from "../../ports/vehicleChecklistRepository.js";
import {
  applyChecklistCompletion,
  normalizeChecklistItems,
  normalizeChecklistName,
  resolveChecklistStatus,
  type VehicleChecklistItemInput,
} from "../../checklists/vehicleChecklistSupport.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnit,
  getChecklistRepository,
  getListingRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.checklist_update";

export type CreateVehicleChecklistInput = {
  items: readonly VehicleChecklistItemInput[];
  listingId: string;
  name: string;
  status?: VehicleChecklistStatus | undefined;
  unitId: string;
};

export async function createVehicleChecklist(
  context: ServiceContext,
  input: CreateVehicleChecklistInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleChecklist> {
  assertPermission(context, permission);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const unit = await findScopedUnit(context, getUnitRepository(ports), input);
  const items = normalizeChecklistItems(input.items);
  const status = resolveChecklistStatus({
    explicitStatus: input.status,
    items,
  });
  const name = normalizeChecklistName(input.name);

  logVehicleServiceEvent(context, "vehicle_checklist.create.started", {
    itemCount: items.length,
    listingId: listing.id,
    status,
    unitId: unit.id,
  });

  const checklist = await getChecklistRepository(ports).create(
    applyChecklistCompletion(context, {
      items,
      name,
      status,
      storeId: context.storeId,
      tenantId: context.tenantId,
      unitId: unit.id,
    }),
  );

  await auditVehicleServiceEvent(context, {
    action: "vehicle_checklist.create",
    category: "data_change",
    changes: [
      { after: checklist.name, path: "name" },
      { after: checklist.status, path: "status" },
      { after: checklist.items.length, path: "items.length" },
    ],
    entityId: checklist.id,
    entityType: "vehicle_checklist",
    metadata: { itemCount: checklist.items.length, status: checklist.status },
    permission,
    relatedEntities: [
      { id: listing.id, type: "vehicle_listing" },
      { id: unit.id, type: "vehicle_unit" },
    ],
    summary: "Created vehicle checklist",
  });

  return checklist;
}
