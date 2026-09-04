import type { AddVehicleCostInput } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import type { UpdateVehicleCostInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleCost.js";
import type { VoidVehicleCostInput } from "../../../domains/vehicle/services/VehicleService/voidVehicleCost.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingDetailResponse } from "./listingResponseDtos.js";

export type InventoryCostServices = {
  addVehicleCost: (
    context: ServiceContext,
    input: AddVehicleCostInput,
  ) => Promise<InventoryListingDetailResponse>;
  updateVehicleCost: (
    context: ServiceContext,
    input: UpdateVehicleCostInput,
  ) => Promise<InventoryListingDetailResponse>;
  voidVehicleCost: (
    context: ServiceContext,
    input: VoidVehicleCostInput,
  ) => Promise<InventoryListingDetailResponse>;
};
