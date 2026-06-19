import type { PermissionKey } from "@lojaveiculosv2/shared";
import { getVehicleListingDetail } from "../../../domains/vehicle/services/VehicleService/getVehicleListingDetail.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  type InventoryListingDetailResponse,
  toDetailDto,
} from "./listingResponseDtos.js";

export async function loadInventoryListingDetailDto(
  context: ServiceContext,
  listingId: string,
  ports: VehicleInventoryServicePorts,
  permission: PermissionKey = "inventory.read",
): Promise<InventoryListingDetailResponse> {
  return toDetailDto(
    await getVehicleListingDetail(context, { listingId, permission }, ports),
  );
}
