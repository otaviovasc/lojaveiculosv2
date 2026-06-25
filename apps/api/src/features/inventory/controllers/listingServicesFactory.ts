import { getVehicleCatalogSnapshot } from "../../../domains/vehicle/services/VehicleCatalogService/getVehicleCatalogSnapshot.js";
import { getVehicleCatalogPriceHistory } from "../../../domains/vehicle/services/VehicleCatalogService/getVehicleCatalogPriceHistory.js";
import { listVehicleCatalogBrands } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogBrands.js";
import { listVehicleCatalogModels } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogModels.js";
import { listVehicleCatalogVersions } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogVersions.js";
import { listVehicleCatalogYears } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogYears.js";
import { createVehicleListing } from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import { createVehicleMedia } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import { deleteVehicleMedia } from "../../../domains/vehicle/services/VehicleService/deleteVehicleMedia.js";
import { listVehicleChecklists } from "../../../domains/vehicle/services/VehicleService/listVehicleChecklists.js";
import { listVehicleListings } from "../../../domains/vehicle/services/VehicleService/listVehicleListings.js";
import { reorderVehicleMedia } from "../../../domains/vehicle/services/VehicleService/reorderVehicleMedia.js";
import { requestVehicleDocumentUpload } from "../../../domains/vehicle/services/VehicleService/requestVehicleDocumentUpload.js";
import { requestVehicleMediaUpload } from "../../../domains/vehicle/services/VehicleService/requestVehicleMediaUpload.js";
import { updateVehicleDescription } from "../../../domains/vehicle/services/VehicleService/updateVehicleDescription.js";
import { updateVehicleMedia } from "../../../domains/vehicle/services/VehicleService/updateVehicleMedia.js";
import {
  cleanCreateInput,
  cleanCreateMediaInput,
} from "./listingServiceInputs.js";
import { loadInventoryListingDetailDto } from "./listingServiceDetail.js";
import type {
  CreateInventoryListingServicesOptions,
  InventoryListingServices,
} from "./listingServices.js";
import { toListDto } from "./listingResponseDtos.js";
import {
  resolveVehicleInventoryPorts,
  resolveVehicleInventoryTransactionRunner,
} from "./listingServicesFactorySupport.js";
import { createInventoryTransactionalServices } from "./listingTransactionalServices.js";

export function createInventoryListingServices(
  options: CreateInventoryListingServicesOptions = {},
): InventoryListingServices {
  const ports = resolveVehicleInventoryPorts(options);
  const transactionRunner = resolveVehicleInventoryTransactionRunner(
    options,
    ports,
  );

  return {
    ...createInventoryTransactionalServices({ ports, transactionRunner }),
    async createListing(context, input) {
      const listing = await createVehicleListing(
        context,
        cleanCreateInput(input),
        ports,
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.create",
      );
    },
    async createMedia(context, input) {
      const media = await createVehicleMedia(
        context,
        cleanCreateMediaInput(input),
        ports,
      );
      return {
        listingId: media.listingId,
        mediaId: media.id,
        storageKey: media.storageKey,
        status: "created",
        url: media.url,
      };
    },
    async deleteMedia(context, input) {
      const media = await deleteVehicleMedia(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        media.listingId,
        ports,
        "inventory.media_delete",
      );
    },
    async getListing(context, input) {
      return loadInventoryListingDetailDto(context, input.listingId, ports);
    },
    async getCatalogSnapshot(context, input) {
      return getVehicleCatalogSnapshot(context, input, ports);
    },
    async getCatalogPriceHistory(context, input) {
      return getVehicleCatalogPriceHistory(context, input, ports);
    },
    async listListings(context, input) {
      return toListDto(await listVehicleListings(context, input, ports));
    },
    async listChecklists(context, input) {
      return listVehicleChecklists(context, input, ports);
    },
    async listCatalogBrands(context, input) {
      return listVehicleCatalogBrands(context, input, ports);
    },
    async listCatalogModels(context, input) {
      return listVehicleCatalogModels(context, input, ports);
    },
    async listCatalogVersions(context, input) {
      return listVehicleCatalogVersions(context, input, ports);
    },
    async listCatalogYears(context, input) {
      return listVehicleCatalogYears(context, input, ports);
    },
    async requestMediaUpload(context, input) {
      return requestVehicleMediaUpload(context, input, ports);
    },
    async reorderMedia(context, input) {
      await reorderVehicleMedia(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        input.listingId,
        ports,
        "inventory.media_update",
      );
    },
    async requestDocumentUpload(context, input) {
      return requestVehicleDocumentUpload(context, input, ports);
    },
    async updateListingDescription(context, input) {
      const listing = await updateVehicleDescription(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.update_description",
      );
    },
    async updateMedia(context, input) {
      const media = await updateVehicleMedia(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        media.listingId,
        ports,
        "inventory.media_update",
      );
    },
  };
}
