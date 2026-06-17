import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";

export type CreateVehicleInput = {
  plate: string | null;
  title: string;
};

export type CreateVehicleResult = {
  vehicleId: string;
  status: "not_implemented";
};

export async function createVehicle(
  context: ServiceContext,
  input: CreateVehicleInput,
): Promise<CreateVehicleResult> {
  assertPermission(context, "inventory.create");

  context.logger.info("vehicle.create.started", {
    requestId: context.requestId,
    storeId: context.storeId,
    title: input.title,
  });

  await context.audit.record({
    action: "vehicle.create",
    actor: context.actor,
    entityId: "pending",
    entityType: "vehicle",
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  return {
    vehicleId: "pending",
    status: "not_implemented",
  };
}
