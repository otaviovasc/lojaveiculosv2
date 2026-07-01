export class VehiclePublicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VehiclePublicationValidationError";
  }
}
