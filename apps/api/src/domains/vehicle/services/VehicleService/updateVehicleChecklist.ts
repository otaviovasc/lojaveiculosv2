import type {
  AuditFieldChange,
  SafeAuditMetadataValue,
} from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleChecklist,
  VehicleChecklistStatus,
} from "../../ports/vehicleChecklistRepository.js";
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
import {
  applyChecklistCompletion,
  normalizeChecklistItems,
  normalizeChecklistName,
  resolveChecklistStatus,
  VehicleChecklistNotFoundError,
  type VehicleChecklistItemInput,
} from "../../checklists/vehicleChecklistSupport.js";

const permission = "inventory.checklist_update";

export type UpdateVehicleChecklistInput = {
  checklistId: string;
  items?: readonly VehicleChecklistItemInput[] | undefined;
  listingId: string;
  name?: string | undefined;
  status?: VehicleChecklistStatus | undefined;
  unitId: string;
};

export async function updateVehicleChecklist(
  context: ServiceContext,
  input: UpdateVehicleChecklistInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleChecklist> {
  assertPermission(context, permission);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const unit = await findScopedUnit(context, getUnitRepository(ports), input);
  const repository = getChecklistRepository(ports);
  const current = await repository.findById({
    checklistId: input.checklistId,
    listingId: listing.id,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: unit.id,
  });
  if (!current) throw new VehicleChecklistNotFoundError(input.checklistId);

  const items = input.items
    ? normalizeChecklistItems(input.items)
    : current.items;
  const status = resolveChecklistStatus({
    explicitStatus: input.status,
    items,
  });
  const next = applyChecklistCompletion(context, {
    ...current,
    items,
    name:
      input.name === undefined
        ? current.name
        : normalizeChecklistName(input.name),
    status,
    updatedAt: new Date(),
  });
  const changes = createChecklistChanges(current, next);

  logVehicleServiceEvent(context, "vehicle_checklist.update.started", {
    changedFields: changes.map((change) => change.path),
    checklistId: current.id,
    listingId: listing.id,
    unitId: unit.id,
  });

  const updated = changes.length ? await repository.save(next) : current;

  await auditVehicleServiceEvent(context, {
    action: "vehicle_checklist.update",
    category: "data_change",
    changes,
    entityId: updated.id,
    entityType: "vehicle_checklist",
    metadata: { changedFields: changes.map((change) => change.path) },
    permission,
    relatedEntities: [
      { id: listing.id, type: "vehicle_listing" },
      { id: unit.id, type: "vehicle_unit" },
    ],
    summary: "Updated vehicle checklist",
  });

  return updated;
}

function createChecklistChanges(
  current: VehicleChecklist,
  next: VehicleChecklist,
): AuditFieldChange[] {
  return [
    changeFor("name", current.name, next.name),
    changeFor("status", current.status, next.status),
    changeFor(
      "items",
      serializeItems(current.items),
      serializeItems(next.items),
    ),
    changeFor(
      "completedAt",
      current.completedAt?.toISOString() ?? null,
      next.completedAt?.toISOString() ?? null,
    ),
    changeFor(
      "completedByUserId",
      current.completedByUserId,
      next.completedByUserId,
    ),
  ].filter((change): change is AuditFieldChange => Boolean(change));
}

function serializeItems(
  items: VehicleChecklist["items"],
): SafeAuditMetadataValue {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    notes: item.notes,
    status: item.status,
  }));
}

function changeFor(
  path: string,
  before: SafeAuditMetadataValue,
  after: SafeAuditMetadataValue,
): AuditFieldChange | null {
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  return { after, before, path };
}
