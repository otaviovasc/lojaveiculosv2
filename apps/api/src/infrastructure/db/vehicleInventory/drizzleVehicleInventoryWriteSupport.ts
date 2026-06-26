import type {
  CreateVehicleMediaRecord,
  CreateVehicleUnitRecord,
  VehicleUnit,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import { VehicleInventoryDrizzleScopeError } from "./drizzleVehicleInventoryScope.js";

export function requireWriteScope(
  record:
    | CreateVehicleMediaRecord
    | CreateVehicleUnitRecord
    | VehicleUnit
    | {
        storeId: string | null;
        tenantId: string | null;
      },
): { storeId: string; tenantId: string } {
  if (!record.storeId) throw new VehicleInventoryDrizzleScopeError("storeId");
  if (!record.tenantId) throw new VehicleInventoryDrizzleScopeError("tenantId");

  return { storeId: record.storeId, tenantId: record.tenantId };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
