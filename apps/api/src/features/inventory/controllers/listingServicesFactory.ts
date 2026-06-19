import { addVehicleCost } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import { getVehicleCatalogSnapshot } from "../../../domains/vehicle/services/VehicleCatalogService/getVehicleCatalogSnapshot.js";
import { listVehicleCatalogBrands } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogBrands.js";
import { listVehicleCatalogModels } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogModels.js";
import { listVehicleCatalogVersions } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogVersions.js";
import { listVehicleCatalogYears } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogYears.js";
import { attachVehicleDocument } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import { attachVehicleUnit } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import { changeVehicleStatus } from "../../../domains/vehicle/services/VehicleService/changeVehicleStatus.js";
import { createVehicleListing } from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import { createVehicleMedia } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import { deleteVehicleMedia } from "../../../domains/vehicle/services/VehicleService/deleteVehicleMedia.js";
import { listVehicleListings } from "../../../domains/vehicle/services/VehicleService/listVehicleListings.js";
import { reorderVehicleMedia } from "../../../domains/vehicle/services/VehicleService/reorderVehicleMedia.js";
import { reserveVehicleListing } from "../../../domains/vehicle/services/VehicleService/reserveVehicleListing.js";
import { requestVehicleDocumentUpload } from "../../../domains/vehicle/services/VehicleService/requestVehicleDocumentUpload.js";
import { requestVehicleMediaUpload } from "../../../domains/vehicle/services/VehicleService/requestVehicleMediaUpload.js";
import { sellVehicleListing } from "../../../domains/vehicle/services/VehicleService/sellVehicleListing.js";
import { updateVehicleDescription } from "../../../domains/vehicle/services/VehicleService/updateVehicleDescription.js";
import { updateVehicleListingDetails } from "../../../domains/vehicle/services/VehicleService/updateVehicleListingDetails.js";
import { updateVehicleMedia } from "../../../domains/vehicle/services/VehicleService/updateVehicleMedia.js";
import { updateVehiclePrice } from "../../../domains/vehicle/services/VehicleService/updateVehiclePrice.js";
import { updateVehicleUnit } from "../../../domains/vehicle/services/VehicleService/updateVehicleUnit.js";
import {
  cleanAttachInput,
  cleanCreateInput,
  cleanCreateMediaInput,
  cleanUpdateListingInput,
  cleanUpdateUnitInput,
} from "./listingServiceInputs.js";
import { loadInventoryListingDetailDto } from "./listingServiceDetail.js";
import type {
  CreateInventoryListingServicesOptions,
  InventoryListingServices,
} from "./listingServices.js";
import { toListDto } from "./listingResponseDtos.js";
import {
  detailPermissionForListingEdit,
  resolveVehicleInventoryPorts,
} from "./listingServicesFactorySupport.js";

export function createInventoryListingServices(
  options: CreateInventoryListingServicesOptions = {},
): InventoryListingServices {
  const ports = resolveVehicleInventoryPorts(options);

  return {
    async addVehicleCost(context, input) {
      await addVehicleCost(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        input.listingId,
        ports,
        "inventory.cost_create",
      );
    },
    async attachListingUnit(context, input) {
      const unit = await attachVehicleUnit(
        context,
        cleanAttachInput(input),
        ports,
      );
      return loadInventoryListingDetailDto(
        context,
        unit.listingId,
        ports,
        "inventory.create",
      );
    },
    async attachVehicleDocument(context, input) {
      const document = await attachVehicleDocument(context, input, ports);
      const listingId =
        document.targetType === "vehicle_listing"
          ? document.targetId
          : input.listingId;
      return loadInventoryListingDetailDto(
        context,
        listingId,
        ports,
        "inventory.document_attach",
      );
    },
    async changeListingStatus(context, input) {
      const listing = await changeVehicleStatus(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.update_status",
      );
    },
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
    async listListings(context, input) {
      return toListDto(await listVehicleListings(context, input, ports));
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
    async reserveListing(context, input) {
      const listing = await reserveVehicleListing(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.reserve",
      );
    },
    async sellListing(context, input) {
      const listing = await sellVehicleListing(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.sell",
      );
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
    async updateListingPrice(context, input) {
      const listing = await updateVehiclePrice(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.update_price",
      );
    },
    async updateListingDetails(context, input) {
      const listing = await updateVehicleListingDetails(
        context,
        cleanUpdateListingInput(input),
        ports,
      );
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        detailPermissionForListingEdit(input),
      );
    },
    async updateListingUnit(context, input) {
      const unit = await updateVehicleUnit(
        context,
        cleanUpdateUnitInput(input),
        ports,
      );
      return loadInventoryListingDetailDto(
        context,
        unit.listingId,
        ports,
        "inventory.update_unit",
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
