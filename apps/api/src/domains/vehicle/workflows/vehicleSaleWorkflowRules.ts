import type {
  VehicleListing,
  VehicleUnit,
} from "../ports/vehicleInventoryRepository.js";

export function assertReservableVehicleState(
  listing: VehicleListing,
  unit: VehicleUnit,
): void {
  if (listing.status !== "available") {
    throw new VehicleWorkflowStateError(
      `Vehicle listing must be available to reserve; current status is ${listing.status}.`,
    );
  }
  if (unit.status !== "available") {
    throw new VehicleWorkflowStateError(
      `Vehicle unit must be available to reserve; current status is ${unit.status}.`,
    );
  }
}

export function assertSellableVehicleState(
  listing: VehicleListing,
  unit: VehicleUnit,
): void {
  if (listing.status !== "available" && listing.status !== "reserved") {
    throw new VehicleWorkflowStateError(
      `Vehicle listing must be available or reserved to sell; current status is ${listing.status}.`,
    );
  }
  if (unit.status !== "available" && unit.status !== "reserved") {
    throw new VehicleWorkflowStateError(
      `Vehicle unit must be available or reserved to sell; current status is ${unit.status}.`,
    );
  }
}

export class VehicleWorkflowValidationError extends Error {
  constructor(fieldName: string) {
    super(`Vehicle workflow requires ${fieldName}`);
    this.name = "VehicleWorkflowValidationError";
  }
}

export class VehicleWorkflowStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleWorkflowStateError";
  }
}
