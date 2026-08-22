import type { AuditFieldChange } from "@lojaveiculosv2/audit";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { updateVehicleCostFinanceEntry } from "../../finance/vehicleFinanceEntries.js";
import type {
  VehicleCost,
  VehicleCostKind,
} from "../../ports/vehicleOperationsRepository.js";
import { VehicleCostStateError } from "../../vehicleCostErrors.js";
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

const permission = "inventory.cost_update";

export type UpdateVehicleCostInput = {
  amountCents: number;
  costDate?: Date | undefined;
  costId: string;
  description?: string | null | undefined;
  kind: VehicleCostKind;
  unitId: string;
};

export async function updateVehicleCost(
  context: ServiceContext,
  input: UpdateVehicleCostInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleCost> {
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
  const repository = getOperationsRepository(ports);
  const current = await findScopedVehicleCost(context, repository, input);
  if (current.status !== "active") throw new VehicleCostStateError();

  const changes = costChanges(current, input);
  logVehicleServiceEvent(context, "vehicle_cost.update.started", {
    changedFields: changes.map((change) => change.path),
    costId: current.id,
    listingId: listing.id,
    unitId: unit.id,
  });

  const updated = await repository.updateCost({
    amountCents: input.amountCents,
    ...(input.costDate ? { costDate: input.costDate } : {}),
    costId: current.id,
    description: input.description ?? null,
    expectedStatus: "active",
    kind: input.kind,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: unit.id,
  });
  if (!updated) throw new VehicleCostStateError();

  const financeEntry = await updateVehicleCostFinanceEntry({
    cost: updated,
    financeRepository: getFinanceRepository(ports),
    listing,
  });
  await auditVehicleServiceEvent(context, {
    action: "vehicle_cost.update",
    category: "data_change",
    changes,
    entityId: updated.id,
    entityType: "vehicle_operation",
    metadata: {
      financeEntryId: financeEntry.entry.id,
      listingId: listing.id,
      unitId: unit.id,
    },
    permission,
    relatedEntities: [{ id: financeEntry.entry.id, type: "finance_entry" }],
    summary: "Updated vehicle cost",
  });
  return updated;
}

function costChanges(
  current: VehicleCost,
  input: UpdateVehicleCostInput,
): AuditFieldChange[] {
  const nextDate = input.costDate ?? current.costDate;
  return [
    change("amountCents", current.amountCents, input.amountCents),
    change("description", current.description, input.description ?? null),
    change("kind", current.kind, input.kind),
    change("costDate", current.costDate.toISOString(), nextDate.toISOString()),
  ].filter((item): item is AuditFieldChange => item !== null);
}

function change(
  path: string,
  before: number | string | null,
  after: number | string | null,
): AuditFieldChange | null {
  return before === after ? null : { after, before, path };
}
