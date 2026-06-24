import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  VehicleUnit,
  VehicleUnitStatus,
} from "../../ports/vehicleInventoryRepository.js";
import {
  auditVehicleServiceEvent,
  actorUserId,
  findScopedListing,
  findScopedUnit,
  getListingRepository,
  getOperationsRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";
import { assertGenericUnitStatusAllowed } from "../../policies/workflowStatusPolicy.js";

const permission = "inventory.update_unit";

export type UpdateVehicleUnitInput = {
  colorName?: string | null;
  listingId: string;
  plate?: string | null;
  status?: VehicleUnitStatus;
  stockNumber?: string | null;
  unitId: string;
  vin?: string | null;
};

export async function updateVehicleUnit(
  context: ServiceContext,
  input: UpdateVehicleUnitInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleUnit> {
  assertPermission(context, permission);
  assertGenericUnitStatusAllowed(input.status);
  await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const repository = getUnitRepository(ports);
  const unit = await findScopedUnit(context, repository, input);
  const changes = createUnitChanges(unit, input);

  logVehicleServiceEvent(context, "vehicle_unit.update.started", {
    changedFields: changes.map((change) => change.path),
    listingId: input.listingId,
    unitId: input.unitId,
  });

  const updated = changes.length
    ? await repository.save({
        ...unit,
        ...(input.colorName !== undefined
          ? { colorName: input.colorName }
          : {}),
        ...(input.plate !== undefined ? { plate: input.plate } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.stockNumber !== undefined
          ? { stockNumber: input.stockNumber }
          : {}),
        updatedAt: new Date(),
        ...(input.vin !== undefined ? { vin: input.vin } : {}),
      })
    : unit;
  if (input.status !== undefined && input.status !== unit.status) {
    await getOperationsRepository(ports).createStatusHistory({
      actorUserId: actorUserId(context),
      fromStatus: unit.status,
      listingId: input.listingId,
      reason: null,
      storeId: context.storeId,
      target: "unit",
      tenantId: context.tenantId,
      toStatus: input.status,
      unitId: unit.id,
    });
  }

  await auditVehicleServiceEvent(context, {
    action: "vehicle_unit.update",
    category: "data_change",
    changes,
    entityId: updated.id,
    entityType: "vehicle_unit",
    metadata: {
      changedFields: changes.map((change) => change.path),
      listingId: input.listingId,
    },
    permission,
    relatedEntities: [{ id: input.listingId, type: "vehicle_listing" }],
    summary: "Updated vehicle unit",
  });

  return updated;
}

function createUnitChanges(
  unit: VehicleUnit,
  input: UpdateVehicleUnitInput,
): AuditFieldChange[] {
  return [
    changeFor("unit.colorName", unit.colorName, input.colorName),
    changeFor("unit.plate", unit.plate, input.plate),
    changeFor("unit.stockNumber", unit.stockNumber, input.stockNumber),
    changeFor("unit.vin", unit.vin, input.vin),
    changeFor("unit.status", unit.status, input.status),
  ].filter((change): change is AuditFieldChange => Boolean(change));
}

function changeFor(
  path: string,
  before: string | null,
  after: string | null | undefined,
): AuditFieldChange | null {
  if (after === undefined || before === after) return null;
  return { after, before, path };
}
