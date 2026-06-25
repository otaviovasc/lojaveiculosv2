import { addVehicleCost } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import { attachVehicleDocument } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import { attachVehicleUnit } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import { changeVehicleStatus } from "../../../domains/vehicle/services/VehicleService/changeVehicleStatus.js";
import { createVehicleChecklist } from "../../../domains/vehicle/services/VehicleService/createVehicleChecklist.js";
import { reserveVehicleListing } from "../../../domains/vehicle/services/VehicleService/reserveVehicleListing.js";
import { sellVehicleListing } from "../../../domains/vehicle/services/VehicleService/sellVehicleListing.js";
import { updateVehicleChecklist } from "../../../domains/vehicle/services/VehicleService/updateVehicleChecklist.js";
import { updateVehicleListingDetails } from "../../../domains/vehicle/services/VehicleService/updateVehicleListingDetails.js";
import { updateVehiclePrice } from "../../../domains/vehicle/services/VehicleService/updateVehiclePrice.js";
import { updateVehicleUnit } from "../../../domains/vehicle/services/VehicleService/updateVehicleUnit.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import {
  cleanAttachInput,
  cleanUpdateListingInput,
  cleanUpdateUnitInput,
} from "./listingServiceInputs.js";
import { loadInventoryListingDetailDto } from "./listingServiceDetail.js";
import type { InventoryListingServices } from "./listingServices.js";
import {
  detailPermissionForListingEdit,
  runVehicleInventoryMutation,
} from "./listingServicesFactorySupport.js";

type InventoryTransactionalServices = Pick<
  InventoryListingServices,
  | "addVehicleCost"
  | "attachListingUnit"
  | "attachVehicleDocument"
  | "changeListingStatus"
  | "createChecklist"
  | "reserveListing"
  | "sellListing"
  | "updateListingDetails"
  | "updateChecklist"
  | "updateListingPrice"
  | "updateListingUnit"
>;

export function createInventoryTransactionalServices(input: {
  ports: VehicleInventoryServicePorts;
  transactionRunner: TransactionRunner<VehicleInventoryServicePorts>;
}): InventoryTransactionalServices {
  const { ports, transactionRunner } = input;

  return {
    async addVehicleCost(context, costInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        addVehicleCost(context, costInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        costInput.listingId,
        ports,
        "inventory.cost_create",
      );
    },
    async attachListingUnit(context, unitInput) {
      const cleanedInput = cleanAttachInput(unitInput);
      const unit = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          attachVehicleUnit(context, cleanedInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        unit.listingId,
        ports,
        "inventory.create",
      );
    },
    async attachVehicleDocument(context, documentInput) {
      const document = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          attachVehicleDocument(context, documentInput, transactionPorts),
      );
      const listingId =
        document.targetType === "vehicle_listing"
          ? document.targetId
          : documentInput.listingId;
      return loadInventoryListingDetailDto(
        context,
        listingId,
        ports,
        "inventory.document_attach",
      );
    },
    async changeListingStatus(context, statusInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          changeVehicleStatus(context, statusInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.update_status",
      );
    },
    async createChecklist(context, checklistInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        createVehicleChecklist(context, checklistInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        checklistInput.listingId,
        ports,
        "inventory.checklist_update",
      );
    },
    async reserveListing(context, reserveInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          reserveVehicleListing(context, reserveInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.reserve",
      );
    },
    async sellListing(context, sellInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          sellVehicleListing(context, sellInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.sell",
      );
    },
    async updateListingDetails(context, detailsInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          updateVehicleListingDetails(
            context,
            cleanUpdateListingInput(detailsInput),
            transactionPorts,
          ),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        detailPermissionForListingEdit(detailsInput),
      );
    },
    async updateChecklist(context, checklistInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        updateVehicleChecklist(context, checklistInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        checklistInput.listingId,
        ports,
        "inventory.checklist_update",
      );
    },
    async updateListingPrice(context, priceInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          updateVehiclePrice(context, priceInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.update_price",
      );
    },
    async updateListingUnit(context, unitInput) {
      const unit = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          updateVehicleUnit(
            context,
            cleanUpdateUnitInput(unitInput),
            transactionPorts,
          ),
      );
      return loadInventoryListingDetailDto(
        context,
        unit.listingId,
        ports,
        "inventory.update_unit",
      );
    },
  };
}
