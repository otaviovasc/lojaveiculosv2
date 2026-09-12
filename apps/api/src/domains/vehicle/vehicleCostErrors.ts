export class VehicleCostNotFoundError extends Error {
  constructor(costId: string) {
    super(`Vehicle cost not found: ${costId}`);
    this.name = "VehicleCostNotFoundError";
  }
}

export class VehicleCostStateError extends Error {
  constructor(message = "Vehicle cost is no longer active.") {
    super(message);
    this.name = "VehicleCostStateError";
  }
}

export class VehicleCostValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehicleCostValidationError";
  }
}

export class VehicleCostFinanceEntryNotFoundError extends Error {
  constructor(costId: string) {
    super(`Finance entry for vehicle cost was not found: ${costId}`);
    this.name = "VehicleCostFinanceEntryNotFoundError";
  }
}

export class VehicleCostFinanceEntryDuplicateError extends Error {
  constructor(costId: string) {
    super(`Multiple finance entries reference vehicle cost: ${costId}`);
    this.name = "VehicleCostFinanceEntryDuplicateError";
  }
}
