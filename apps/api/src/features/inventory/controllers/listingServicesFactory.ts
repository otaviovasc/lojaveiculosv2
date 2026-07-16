import { getVehicleCatalogSnapshot } from "../../../domains/vehicle/services/VehicleCatalogService/getVehicleCatalogSnapshot.js";
import { getVehicleCatalogPriceHistory } from "../../../domains/vehicle/services/VehicleCatalogService/getVehicleCatalogPriceHistory.js";
import { listVehicleCatalogBrands } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogBrands.js";
import { listVehicleCatalogModels } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogModels.js";
import { listVehicleCatalogVersions } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogVersions.js";
import { listVehicleCatalogYears } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogYears.js";
import { approveVehicleAiStudioImage } from "../../../domains/vehicle/services/VehicleService/approveVehicleAiStudioImage.js";
import { createVehicleListing } from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import { analyzeVehicleListingResale } from "../../../domains/vehicle/services/VehicleService/analyzeVehicleListingResale.js";
import { listVehicleAuditEvents } from "../../../domains/vehicle/services/VehicleService/listVehicleAuditEvents.js";
import { createVehicleMedia } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import { deleteVehicleMedia } from "../../../domains/vehicle/services/VehicleService/deleteVehicleMedia.js";
import { generateVehicleAiStudioImage } from "../../../domains/vehicle/services/VehicleService/generateVehicleAiStudioImage.js";
import { getVehicleMedia } from "../../../domains/vehicle/services/VehicleService/getVehicleMedia.js";
import { listVehicleChecklists } from "../../../domains/vehicle/services/VehicleService/listVehicleChecklists.js";
import { listVehicleChecklistOverview } from "../../../domains/vehicle/services/VehicleService/listVehicleChecklistOverview.js";
import { exportVehicleChecklistReport } from "../../../domains/vehicle/services/VehicleService/exportVehicleChecklistReport.js";
import { listVehicleListings } from "../../../domains/vehicle/services/VehicleService/listVehicleListings.js";
import { listVehicleUnits } from "../../../domains/vehicle/services/VehicleService/listVehicleUnits.js";
import {
  archiveVehicleSupplier,
  createVehicleSupplier,
  listVehicleSuppliers,
  updateVehicleSupplier,
} from "../../../domains/vehicle/services/VehicleService/manageVehicleSuppliers.js";
import {
  getVehicleUnitAcquisition,
  upsertVehicleUnitAcquisition,
} from "../../../domains/vehicle/services/VehicleService/manageVehicleUnitAcquisition.js";
import { reorderVehicleMedia } from "../../../domains/vehicle/services/VehicleService/reorderVehicleMedia.js";
import { requestVehicleDocumentUpload } from "../../../domains/vehicle/services/VehicleService/requestVehicleDocumentUpload.js";
import { requestVehicleMediaUpload } from "../../../domains/vehicle/services/VehicleService/requestVehicleMediaUpload.js";
import { updateVehicleDescription } from "../../../domains/vehicle/services/VehicleService/updateVehicleDescription.js";
import { updateVehicleMedia } from "../../../domains/vehicle/services/VehicleService/updateVehicleMedia.js";
import { getUnitRepository } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  cleanCreateInput,
  cleanCreateMediaInput,
} from "./listingServiceInputs.js";
import { loadInventoryListingDetailDto } from "./listingServiceDetail.js";
import type {
  CreateInventoryListingServicesOptions,
  InventoryListingServices,
} from "./listingServices.js";
import { toListDto, toUnitListDto } from "./listingResponseDtos.js";
import {
  resolveVehicleInventoryPorts,
  resolveVehicleInventoryTransactionRunner,
  runVehicleInventoryMutation,
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
    exportChecklistReport: (context, input) =>
      exportVehicleChecklistReport(context, input, ports),
    async analyzeListingResale(context, input) {
      const listing = await analyzeVehicleListingResale(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        listing.id,
        ports,
        "inventory.read",
      );
    },
    archiveVehicleSupplier: (context, input) =>
      archiveVehicleSupplier(context, input, ports),
    async approveAiStudioImage(context, input) {
      const media = await approveVehicleAiStudioImage(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        await findListingIdForUnit(context, media.unitId, ports),
        ports,
        "inventory.ai_studio_generate",
      );
    },
    async createListing(context, input) {
      const listing = await runVehicleInventoryMutation(
        transactionRunner,
        (transactionPorts) =>
          createVehicleListing(
            context,
            cleanCreateInput(input),
            transactionPorts,
          ),
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
        mediaId: media.id,
        storageKey: media.storageKey,
        status: "created",
        unitId: media.unitId,
        url: media.url,
      };
    },
    createVehicleSupplier: (context, input) =>
      createVehicleSupplier(context, input, ports),
    async deleteMedia(context, input) {
      const media = await deleteVehicleMedia(context, input, ports);
      return loadInventoryListingDetailDto(
        context,
        await findListingIdForUnit(context, media.unitId, ports),
        ports,
        "inventory.media_delete",
      );
    },
    async getListing(context, input) {
      return loadInventoryListingDetailDto(context, input.listingId, ports);
    },
    getMedia: (context, input) => getVehicleMedia(context, input, ports),
    async generateAiStudioImage(context, input) {
      return generateVehicleAiStudioImage(context, input, ports);
    },
    getVehicleUnitAcquisition: (context, input) =>
      getVehicleUnitAcquisition(context, input, ports),
    async getCatalogSnapshot(context, input) {
      return getVehicleCatalogSnapshot(context, input, ports);
    },
    async getCatalogPriceHistory(context, input) {
      return getVehicleCatalogPriceHistory(context, input, ports);
    },
    async listListings(context, input) {
      return toListDto(await listVehicleListings(context, input, ports));
    },
    listListingAuditEvents: (context, input) =>
      listVehicleAuditEvents(context, input, ports),
    async listUnits(context, input) {
      return toUnitListDto(await listVehicleUnits(context, input, ports));
    },
    async listChecklists(context, input) {
      return listVehicleChecklists(context, input, ports);
    },
    async listChecklistOverview(context, input) {
      return listVehicleChecklistOverview(context, input, ports);
    },
    listVehicleSuppliers: (context, input) =>
      listVehicleSuppliers(context, input, ports),
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
        await findListingIdForUnit(context, input.unitId, ports),
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
        await findListingIdForUnit(context, media.unitId, ports),
        ports,
        "inventory.media_update",
      );
    },
    updateVehicleSupplier: (context, input) =>
      updateVehicleSupplier(context, input, ports),
    upsertVehicleUnitAcquisition: (context, input) =>
      upsertVehicleUnitAcquisition(context, input, ports),
  };
}

async function findListingIdForUnit(
  context: Parameters<InventoryListingServices["getListing"]>[0],
  unitId: string,
  ports: ReturnType<typeof resolveVehicleInventoryPorts>,
): Promise<string> {
  const unit = await getUnitRepository(ports).findById({
    storeId: context.storeId,
    tenantId: context.tenantId,
    unitId,
  });

  if (!unit) throw new Error(`Vehicle unit not found: ${unitId}`);
  return unit.listingId;
}
