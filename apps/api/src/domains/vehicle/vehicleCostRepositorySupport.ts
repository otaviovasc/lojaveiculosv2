import type { ServiceContext } from "../../shared/serviceContext.js";
import type {
  VehicleCost,
  VehicleOperationsRepository,
} from "./ports/vehicleOperationsRepository.js";
import { VehicleCostNotFoundError } from "./vehicleCostErrors.js";

export async function findScopedVehicleCost(
  context: ServiceContext,
  repository: VehicleOperationsRepository,
  input: { costId: string; unitId: string },
): Promise<VehicleCost> {
  const cost = await repository.findCost({
    ...input,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });
  if (!cost) throw new VehicleCostNotFoundError(input.costId);
  return cost;
}
