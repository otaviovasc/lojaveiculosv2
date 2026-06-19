import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { createVehicleCostFinanceEntry } from "../../finance/vehicleFinanceEntries.js";
import type {
  VehicleCost,
  VehicleCostKind,
} from "../../ports/vehicleOperationsRepository.js";
import {
  auditVehicleServiceEvent,
  findScopedListing,
  findScopedUnit,
  getFinanceRepository,
  getListingRepository,
  getOperationsRepository,
  getUnitRepository,
  logVehicleServiceEvent,
  type VehicleInventoryServicePorts,
} from "./serviceSupport.js";

const permission = "inventory.cost_create";

export type AddVehicleCostInput = {
  amountCents: number;
  costDate?: Date | undefined;
  description?: string | null | undefined;
  kind: VehicleCostKind;
  listingId: string;
  unitId?: string | undefined;
};

export async function addVehicleCost(
  context: ServiceContext,
  input: AddVehicleCostInput,
  ports?: VehicleInventoryServicePorts,
): Promise<VehicleCost> {
  assertPermission(context, permission);
  const listing = await findScopedListing(
    context,
    getListingRepository(ports),
    input.listingId,
  );
  const unitId = input.unitId ?? listing.unitIds[0];
  if (!unitId) throw new VehicleCostMissingUnitError(input.listingId);
  const unit = await findScopedUnit(context, getUnitRepository(ports), {
    listingId: listing.id,
    unitId,
  });

  logVehicleServiceEvent(context, "vehicle_cost.create.started", {
    amountCents: input.amountCents,
    kind: input.kind,
    listingId: listing.id,
    unitId: unit.id,
  });
  const cost = await getOperationsRepository(ports).createCost({
    amountCents: input.amountCents,
    costDate: input.costDate ?? new Date(),
    description: input.description ?? null,
    kind: input.kind,
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId: unit.id,
  });
  const financeEntry = await createVehicleCostFinanceEntry({
    cost,
    financeRepository: getFinanceRepository(ports),
    listing,
  });
  await auditVehicleServiceEvent(context, {
    action: "vehicle_cost.create",
    category: "data_change",
    entityId: cost.id,
    entityType: "vehicle_operation",
    metadata: {
      amountCents: cost.amountCents,
      financeEntryId: financeEntry.entry.id,
      kind: cost.kind,
      listingId: listing.id,
      unitId: unit.id,
    },
    permission,
    relatedEntities: [{ id: financeEntry.entry.id, type: "finance_entry" }],
    summary: "Created vehicle cost",
  });
  return cost;
}

export class VehicleCostMissingUnitError extends Error {
  constructor(listingId: string) {
    super(`Vehicle listing has no unit for cost allocation: ${listingId}`);
    this.name = "VehicleCostMissingUnitError";
  }
}
