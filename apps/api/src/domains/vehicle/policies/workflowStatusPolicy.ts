import type {
  VehicleListingStatus,
  VehicleUnitStatus,
} from "../ports/vehicleInventoryRepository.js";

export class VehicleWorkflowStatusError extends Error {
  constructor(entity: "listing" | "unit", status: string) {
    super(
      `Vehicle ${entity} status ${status} must be changed through the canonical workflow.`,
    );
    this.name = "VehicleWorkflowStatusError";
  }
}

export function assertGenericListingStatusAllowed(
  status: VehicleListingStatus | undefined,
) {
  if (status === "sold_out") {
    throw new VehicleWorkflowStatusError("listing", status);
  }
}

export function assertGenericUnitStatusAllowed(
  status: VehicleUnitStatus | undefined,
) {
  if (!status) return;
  if (status === "reserved" || status === "sold") {
    throw new VehicleWorkflowStatusError("unit", status);
  }
}
