import { addVehicleCost } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import {
  getUnitRepository,
  type VehicleInventoryServicePorts,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import { updateVehicleCost } from "../../../domains/vehicle/services/VehicleService/updateVehicleCost.js";
import { voidVehicleCost } from "../../../domains/vehicle/services/VehicleService/voidVehicleCost.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import type { InventoryCostServices } from "./listingCostServices.js";
import { loadInventoryListingDetailDto } from "./listingServiceDetail.js";
import { runVehicleInventoryMutation } from "./listingServicesFactorySupport.js";

export function createInventoryCostTransactionalServices(input: {
  ports: VehicleInventoryServicePorts;
  transactionRunner: TransactionRunner<VehicleInventoryServicePorts>;
}): InventoryCostServices {
  const { ports, transactionRunner } = input;
  return {
    async addVehicleCost(context, costInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        addVehicleCost(context, costInput, transactionPorts),
      );
      return loadCostListingDetail(
        context,
        costInput.unitId,
        ports,
        "inventory.cost_create",
      );
    },
    async updateVehicleCost(context, costInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        updateVehicleCost(context, costInput, transactionPorts),
      );
      return loadCostListingDetail(
        context,
        costInput.unitId,
        ports,
        "inventory.cost_update",
      );
    },
    async voidVehicleCost(context, costInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        voidVehicleCost(context, costInput, transactionPorts),
      );
      return loadCostListingDetail(
        context,
        costInput.unitId,
        ports,
        "inventory.cost_void",
      );
    },
  };
}

async function loadCostListingDetail(
  context: Parameters<InventoryCostServices["addVehicleCost"]>[0],
  unitId: string,
  ports: VehicleInventoryServicePorts,
  permission:
    "inventory.cost_create" | "inventory.cost_update" | "inventory.cost_void",
) {
  const unit = await getUnitRepository(ports).findById({
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId,
  });
  if (!unit) throw new Error(`Vehicle unit not found: ${unitId}`);
  return loadInventoryListingDetailDto(
    context,
    unit.listingId,
    ports,
    permission,
  );
}
