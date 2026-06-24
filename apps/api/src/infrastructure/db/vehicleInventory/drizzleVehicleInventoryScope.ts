import type {
  CreateVehicleListingRecord,
  FindVehicleListingInput,
  ListVehicleChildrenInput,
  ListVehicleListingsInput,
  VehicleListing,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

export class VehicleInventoryDrizzleScopeError extends Error {
  constructor(fieldName: "storeId" | "tenantId") {
    super(`DB-backed vehicle inventory requires a non-null ${fieldName}`);
    this.name = "VehicleInventoryDrizzleScopeError";
  }
}

export function isVehicleInventoryUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function requireDbScope(
  record:
    | CreateVehicleListingRecord
    | FindVehicleListingInput
    | ListVehicleChildrenInput
    | ListVehicleListingsInput
    | VehicleListing,
): { storeId: string; tenantId: string } {
  if (!record.storeId) throw new VehicleInventoryDrizzleScopeError("storeId");
  if (!record.tenantId) throw new VehicleInventoryDrizzleScopeError("tenantId");

  return { storeId: record.storeId, tenantId: record.tenantId };
}
