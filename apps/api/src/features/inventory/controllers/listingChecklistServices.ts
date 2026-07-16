import type { VehicleChecklist } from "../../../domains/vehicle/ports/vehicleChecklistRepository.js";
import type { VehicleChecklistOverview } from "../../../domains/vehicle/readModels/vehicleChecklistOverview.js";
import type { CreateVehicleChecklistInput } from "../../../domains/vehicle/services/VehicleService/createVehicleChecklist.js";
import type { VehicleChecklistReport } from "../../../domains/vehicle/services/VehicleService/exportVehicleChecklistReport.js";
import type { VehicleChecklistOverviewInput } from "../../../domains/vehicle/services/VehicleService/listVehicleChecklistOverview.js";
import type { ListVehicleChecklistsInput } from "../../../domains/vehicle/services/VehicleService/listVehicleChecklists.js";
import type { UpdateVehicleChecklistInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleChecklist.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { InventoryListingDetailResponse } from "./listingResponseDtos.js";

export type InventoryChecklistServices = {
  createChecklist: (
    context: ServiceContext,
    input: CreateVehicleChecklistInput,
  ) => Promise<InventoryListingDetailResponse>;
  exportChecklistReport: (
    context: ServiceContext,
    input: VehicleChecklistOverviewInput,
  ) => Promise<VehicleChecklistReport>;
  listChecklists: (
    context: ServiceContext,
    input: ListVehicleChecklistsInput,
  ) => Promise<readonly VehicleChecklist[]>;
  listChecklistOverview: (
    context: ServiceContext,
    input: VehicleChecklistOverviewInput,
  ) => Promise<VehicleChecklistOverview>;
  updateChecklist: (
    context: ServiceContext,
    input: UpdateVehicleChecklistInput,
  ) => Promise<InventoryListingDetailResponse>;
};
