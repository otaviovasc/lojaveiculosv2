import { addVehicleCost } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import { attachVehicleDocument } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import { attachVehicleUnit } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import { changeVehicleStatus } from "../../../domains/vehicle/services/VehicleService/changeVehicleStatus.js";
import { createVehicleChecklist } from "../../../domains/vehicle/services/VehicleService/createVehicleChecklist.js";
import { deleteVehicleListing } from "../../../domains/vehicle/services/VehicleService/deleteVehicleListing.js";
import { releaseVehicleUnitReservation } from "../../../domains/vehicle/services/VehicleService/releaseVehicleUnitReservation.js";
import { reserveVehicleUnit } from "../../../domains/vehicle/services/VehicleService/reserveVehicleUnit.js";
import { sellVehicleUnit } from "../../../domains/vehicle/services/VehicleService/sellVehicleUnit.js";
import { updateVehicleChecklist } from "../../../domains/vehicle/services/VehicleService/updateVehicleChecklist.js";
import { updateVehicleListingDetails } from "../../../domains/vehicle/services/VehicleService/updateVehicleListingDetails.js";
import { updateVehiclePrice } from "../../../domains/vehicle/services/VehicleService/updateVehiclePrice.js";
import { updateVehicleUnit } from "../../../domains/vehicle/services/VehicleService/updateVehicleUnit.js";
import {
  getUnitRepository,
  type VehicleInventoryServicePorts,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
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
import { createInventoryPublicationTransactionalServices } from "./listingPublicationServices.js";

type InventoryTransactionalServices = Pick<
  InventoryListingServices,
  | "addVehicleCost"
  | "attachListingUnit"
  | "attachVehicleDocument"
  | "changeListingStatus"
  | "createChecklist"
  | "deleteListing"
  | "publishListing"
  | "releaseUnitReservation"
  | "reserveUnit"
  | "sellUnit"
  | "unpublishListing"
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
    ...createInventoryPublicationTransactionalServices({
      ports,
      transactionRunner,
    }),
    async addVehicleCost(context, costInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        addVehicleCost(context, costInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        await findListingIdForUnit(context, costInput.unitId, ports),
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
      return loadInventoryListingDetailDto(
        context,
        await findListingIdForUnit(context, documentInput.unitId, ports),
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
        await findListingIdForUnit(context, checklistInput.unitId, ports),
        ports,
        "inventory.checklist_update",
      );
    },
    async deleteListing(context, deleteInput) {
      await runVehicleInventoryMutation(transactionRunner, (transactionPorts) =>
        deleteVehicleListing(context, deleteInput, transactionPorts),
      );
    },
    async reserveUnit(context, reserveInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          reserveVehicleUnit(context, reserveInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.reserve",
      );
    },
    async releaseUnitReservation(context, releaseInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          releaseVehicleUnitReservation(
            context,
            releaseInput,
            transactionPorts,
          ),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.reserve",
      );
    },
    async sellUnit(context, sellInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          sellVehicleUnit(context, sellInput, transactionPorts),
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
        await findListingIdForUnit(context, checklistInput.unitId, ports),
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

async function findListingIdForUnit(
  context: Parameters<InventoryListingServices["getListing"]>[0],
  unitId: string,
  ports: VehicleInventoryServicePorts,
): Promise<string> {
  const unit = await getUnitRepository(ports).findById({
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId,
  });

  if (!unit) throw new Error(`Vehicle unit not found: ${unitId}`);
  return unit.listingId;
}
