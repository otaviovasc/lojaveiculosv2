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
  findScopedUnitById,
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
  unitId: string;
};

export async function addVehicleCost(
  context: ServiceContext,
  input: AddVehicleCostInput,
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
