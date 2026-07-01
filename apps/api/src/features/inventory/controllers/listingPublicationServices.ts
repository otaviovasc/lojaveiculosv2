import {
  publishVehicleListing,
  unpublishVehicleListing,
} from "../../../domains/vehicle/services/VehicleService/publishVehicleListing.js";
import type { VehicleInventoryServicePorts } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import type { TransactionRunner } from "../../../shared/transaction.js";
import { loadInventoryListingDetailDto } from "./listingServiceDetail.js";
import type { InventoryListingServices } from "./listingServices.js";
import { runVehicleInventoryMutation } from "./listingServicesFactorySupport.js";

type InventoryPublicationServices = Pick<
  InventoryListingServices,
  "publishListing" | "unpublishListing"
>;

export function createInventoryPublicationTransactionalServices(input: {
  ports: VehicleInventoryServicePorts;
  transactionRunner: TransactionRunner<VehicleInventoryServicePorts>;
}): InventoryPublicationServices {
  const { ports, transactionRunner } = input;

  return {
    async publishListing(context, publishInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          publishVehicleListing(context, publishInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.update_status",
      );
    },
    async unpublishListing(context, unpublishInput) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          unpublishVehicleListing(context, unpublishInput, transactionPorts),
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.update_status",
      );
    },
  };
}
