import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";

export type GetVehicleInput = {
  vehicleId: string;
};

export type GetVehicleResult = {
  vehicleId: string;
  status: "not_implemented";
};

export async function getVehicle(
  context: ServiceContext,
  input: GetVehicleInput,
): Promise<GetVehicleResult> {
  assertPermission(context, "inventory.read");

  context.logger.info("vehicle.get.started", {
    requestId: context.requestId,
    storeId: context.storeId,
    vehicleId: input.vehicleId,
  });

  await context.audit.record({
    action: "vehicle.get",
    actor: context.actor,
    entityId: input.vehicleId,
    entityType: "vehicle",
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  return {
    vehicleId: input.vehicleId,
    status: "not_implemented",
  };
}
