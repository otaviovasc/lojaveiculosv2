import type {
  VehicleListingStatus,
  VehicleUnitStatus,
} from "../ports/vehicleInventoryRepository.js";

const workflowOnlyStatuses = ["reserved", "sold"] as const;

export class VehicleWorkflowStatusError extends Error {
  constructor(status: VehicleListingStatus) {
    super(
      `Listing status ${status} must be changed through the canonical workflow.`,
    );
    this.name = "VehicleWorkflowStatusError";
  }
}

export function assertGenericListingStatusAllowed(
  status: VehicleListingStatus | undefined,
) {
  if (!status) return;
  if ((workflowOnlyStatuses as readonly string[]).includes(status)) {
    throw new VehicleWorkflowStatusError(status);
  }
}

export function assertGenericUnitStatusAllowed(
  status: VehicleUnitStatus | undefined,
) {
  if (!status) return;
  if ((workflowOnlyStatuses as readonly string[]).includes(status)) {
    throw new VehicleWorkflowStatusError(status as VehicleListingStatus);
  }
}
