import type { VehicleListingCatalog } from "../ports/vehicleInventoryTypes.js";

const requiredFipeFields = [
  "brandCode",
  "brandName",
  "fipeCode",
  "modelCode",
  "modelName",
  "modelYear",
  "vehicleType",
  "yearCode",
  "yearName",
] as const;

export class VehicleCatalogIdentityValidationError extends Error {
  readonly missingFields: readonly string[];

  constructor(missingFields: readonly string[]) {
    super(`FIPE catalog identity is incomplete: ${missingFields.join(", ")}.`);
    this.name = "VehicleCatalogIdentityValidationError";
    this.missingFields = missingFields;
  }
}

export function assertCompleteFipeCatalogIdentity(
  catalog: VehicleListingCatalog | null | undefined,
): void {
  if (!catalog || catalog.source !== "fipe") return;
  const missingFields = requiredFipeFields.filter((field) => {
    const value = catalog[field];
    return value === null || value === undefined || value === "";
  });
  if (missingFields.length) {
    throw new VehicleCatalogIdentityValidationError(missingFields);
  }
}
