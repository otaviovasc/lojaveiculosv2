import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { voidVehicleCostFinanceEntry } from "../../finance/vehicleFinanceEntries.js";
import type { VehicleCost } from "../../ports/vehicleOperationsRepository.js";
import {
  VehicleCostStateError,
  VehicleCostValidationError,
} from "../../vehicleCostErrors.js";
import { findScopedVehicleCost } from "../../vehicleCostRepositorySupport.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnitById,
  getFinanceRepository,
  getListingRepository,
  getOperationsRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.cost_void";

export type VoidVehicleCostInput = {
  costId: string;
  reason: string;
  unitId: string;
};

export async function voidVehicleCost(
  context: ServiceContext,
  input: VoidVehicleCostInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleCost> {
  assertPermission(context, permission);
  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new VehicleCostValidationError(
      "Vehicle cost void reason must contain at least 3 characters.",
    );
  }
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
  const repository = getOperationsRepository(ports);
  const current = await findScopedVehicleCost(context, repository, input);
  if (current.status !== "active") throw new VehicleCostStateError();

  logVehicleServiceEvent(context, "vehicle_cost.void.started", {
    costId: current.id,
    listingId: listing.id,
    unitId: unit.id,
  });
  const voidedAt = new Date();
  const updated = await repository.updateCost({
    costId: current.id,
    expectedStatus: "active",
    status: "voided",
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: unit.id,
    voidedAt,
    voidReason: reason,
  });
  if (!updated) throw new VehicleCostStateError();

  const financeEntry = await voidVehicleCostFinanceEntry({
    cost: updated,
    financeRepository: getFinanceRepository(ports),
    reason,
  });
  await auditVehicleServiceEvent(context, {
    action: "vehicle_cost.void",
    category: "data_change",
    changes: [
      { after: "voided", before: current.status, path: "status" },
      { after: voidedAt.toISOString(), before: null, path: "voidedAt" },
    ],
    entityId: updated.id,
    entityType: "vehicle_operation",
    metadata: {
      financeEntryId: financeEntry.entry.id,
      listingId: listing.id,
      reason,
      unitId: unit.id,
    },
    permission,
    relatedEntities: [{ id: financeEntry.entry.id, type: "finance_entry" }],
    summary: "Voided vehicle cost",
  });
  return updated;
}
