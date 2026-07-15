import type { AttachVehicleDocumentInput } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import type { AddVehicleCostInput } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import type { ApproveVehicleAiStudioImageInput } from "../../../domains/vehicle/services/VehicleService/approveVehicleAiStudioImage.js";
import type { CreateVehicleMediaInput } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import type { DeleteVehicleMediaInput } from "../../../domains/vehicle/services/VehicleService/deleteVehicleMedia.js";
import type { DeleteVehicleListingInput } from "../../../domains/vehicle/services/VehicleService/deleteVehicleListing.js";
import type {
  GenerateVehicleAiStudioImageInput,
  VehicleAiStudioGenerationResult,
} from "../../../domains/vehicle/services/VehicleService/generateVehicleAiStudioImage.js";
import type { ListVehicleListingsInput } from "../../../domains/vehicle/services/VehicleService/listVehicleListings.js";
import type { ListVehicleUnitsInput } from "../../../domains/vehicle/services/VehicleService/listVehicleUnits.js";
import type { CreateVehicleChecklistInput } from "../../../domains/vehicle/services/VehicleService/createVehicleChecklist.js";
import type { ListVehicleChecklistsInput } from "../../../domains/vehicle/services/VehicleService/listVehicleChecklists.js";
import type { UpdateVehicleChecklistInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleChecklist.js";
import type {
  CreateVehicleSupplierInput,
  ListVehicleSuppliersInput,
  UpdateVehicleSupplierInput,
} from "../../../domains/vehicle/services/VehicleService/manageVehicleSuppliers.js";
import type { VehicleUnitAcquisitionInput } from "../../../domains/vehicle/services/VehicleService/manageVehicleUnitAcquisition.js";
import type { ReorderVehicleMediaInput } from "../../../domains/vehicle/services/VehicleService/reorderVehicleMedia.js";
import type {
  PublishVehicleListingInput,
  UnpublishVehicleListingInput,
} from "../../../domains/vehicle/services/VehicleService/publishVehicleListing.js";
import type { ReserveVehicleUnitInput } from "../../../domains/vehicle/services/VehicleService/reserveVehicleUnit.js";
import type { ReleaseVehicleUnitReservationInput } from "../../../domains/vehicle/services/VehicleService/releaseVehicleUnitReservation.js";
import type { RequestVehicleDocumentUploadInput } from "../../../domains/vehicle/services/VehicleService/requestVehicleDocumentUpload.js";
import type { RequestVehicleMediaUploadInput } from "../../../domains/vehicle/services/VehicleService/requestVehicleMediaUpload.js";
import type { SellVehicleUnitInput } from "../../../domains/vehicle/services/VehicleService/sellVehicleUnit.js";
import type { UpdateVehicleListingDetailsInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleListingDetails.js";
import type { UpdateVehicleMediaInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleMedia.js";
import type { UpdateVehicleUnitInput } from "../../../domains/vehicle/services/VehicleService/updateVehicleUnit.js";
import type { VehicleListingStatus } from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";
import type { VehicleMediaUpload } from "../../../domains/vehicle/ports/vehicleMediaStorage.js";
import type { VehicleChecklist } from "../../../domains/vehicle/ports/vehicleChecklistRepository.js";
import type {
  VehicleSupplier,
  VehicleUnitAcquisition,
} from "../../../domains/vehicle/ports/vehicleAcquisitionRepository.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { VehicleAuditEvent } from "../../../domains/vehicle/ports/vehicleAuditRepository.js";
import type { GetVehicleCatalogSnapshotInput } from "../../../domains/vehicle/services/VehicleCatalogService/getVehicleCatalogSnapshot.js";
import type { GetVehicleCatalogPriceHistoryInput } from "../../../domains/vehicle/services/VehicleCatalogService/getVehicleCatalogPriceHistory.js";
import type { ListVehicleCatalogBrandsInput } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogBrands.js";
import type { ListVehicleCatalogModelsInput } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogModels.js";
import type { ListVehicleCatalogVersionsInput } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogVersions.js";
import type { ListVehicleCatalogYearsInput } from "../../../domains/vehicle/services/VehicleCatalogService/listVehicleCatalogYears.js";
import type {
  VehicleCatalogOption,
  VehicleCatalogPriceHistory,
  VehicleCatalogSnapshot,
  VehicleCatalogYearOption,
} from "../../../domains/vehicle/ports/vehicleCatalogProvider.js";
import type { VehicleCatalogVersionOption } from "../../../domains/vehicle/ports/vehicleCatalogRepository.js";
import {
  type InventoryListingDetailResponse,
  type InventoryListingListResponse,
  type InventoryUnitListResponse,
} from "./listingResponseDtos.js";
import { createInventoryListingServices } from "./listingServicesFactory.js";
import type {
  AttachListingInput,
  CreateListingInput,
  VehicleMediaResult,
} from "./listingServiceTypes.js";
export { listingStatuses } from "./vehicle.controller.statuses.js";
export type {
  CreateInventoryListingServicesOptions,
  DrizzleVehicleInventoryAdapter,
} from "./listingServiceOptions.js";

export type InventoryListingServices = {
  analyzeListingResale: (
    context: ServiceContext,
    input: { listingId: string },
  ) => Promise<InventoryListingDetailResponse>;
  archiveVehicleSupplier: (
    context: ServiceContext,
    input: { supplierId: string },
  ) => Promise<VehicleSupplier>;
  attachListingUnit: (
    context: ServiceContext,
    input: AttachListingInput,
  ) => Promise<InventoryListingDetailResponse>;
  approveAiStudioImage: (
    context: ServiceContext,
    input: ApproveVehicleAiStudioImageInput,
  ) => Promise<InventoryListingDetailResponse>;
  attachVehicleDocument: (
    context: ServiceContext,
    input: AttachVehicleDocumentInput,
  ) => Promise<InventoryListingDetailResponse>;
  addVehicleCost: (
    context: ServiceContext,
    input: AddVehicleCostInput,
  ) => Promise<InventoryListingDetailResponse>;
  changeListingStatus: (
    context: ServiceContext,
    input: { listingId: string; status: VehicleListingStatus },
  ) => Promise<InventoryListingDetailResponse>;
  createChecklist: (
    context: ServiceContext,
    input: CreateVehicleChecklistInput,
  ) => Promise<InventoryListingDetailResponse>;
  createListing: (
    context: ServiceContext,
    input: CreateListingInput,
  ) => Promise<InventoryListingDetailResponse>;
  deleteListing: (
    context: ServiceContext,
    input: DeleteVehicleListingInput,
  ) => Promise<void>;
  createVehicleSupplier: (
    context: ServiceContext,
    input: CreateVehicleSupplierInput,
  ) => Promise<VehicleSupplier>;
  createMedia: (
    context: ServiceContext,
    input: CreateVehicleMediaInput,
  ) => Promise<VehicleMediaResult>;
  deleteMedia: (
    context: ServiceContext,
    input: DeleteVehicleMediaInput,
  ) => Promise<InventoryListingDetailResponse>;
  getListing: (
    context: ServiceContext,
    input: { listingId: string },
  ) => Promise<InventoryListingDetailResponse>;
  generateAiStudioImage: (
    context: ServiceContext,
    input: GenerateVehicleAiStudioImageInput,
  ) => Promise<VehicleAiStudioGenerationResult>;
  getVehicleUnitAcquisition: (
    context: ServiceContext,
    input: { unitId: string },
  ) => Promise<VehicleUnitAcquisition | null>;
  getCatalogSnapshot: (
    context: ServiceContext,
    input: GetVehicleCatalogSnapshotInput,
  ) => Promise<VehicleCatalogSnapshot>;
  getCatalogPriceHistory: (
    context: ServiceContext,
    input: GetVehicleCatalogPriceHistoryInput,
  ) => Promise<VehicleCatalogPriceHistory>;
  listListings: (
    context: ServiceContext,
    input: ListVehicleListingsInput,
  ) => Promise<InventoryListingListResponse>;
  listListingAuditEvents: (
    context: ServiceContext,
    input: { listingId: string; limit?: number },
  ) => Promise<readonly VehicleAuditEvent[]>;
  listUnits: (
    context: ServiceContext,
    input: ListVehicleUnitsInput,
  ) => Promise<InventoryUnitListResponse>;
  publishListing: (
    context: ServiceContext,
    input: PublishVehicleListingInput,
  ) => Promise<InventoryListingDetailResponse>;
  listChecklists: (
    context: ServiceContext,
    input: ListVehicleChecklistsInput,
  ) => Promise<readonly VehicleChecklist[]>;
  listVehicleSuppliers: (
    context: ServiceContext,
    input: ListVehicleSuppliersInput,
  ) => Promise<readonly VehicleSupplier[]>;
  listCatalogBrands: (
    context: ServiceContext,
    input: ListVehicleCatalogBrandsInput,
  ) => Promise<readonly VehicleCatalogOption[]>;
  listCatalogModels: (
    context: ServiceContext,
    input: ListVehicleCatalogModelsInput,
  ) => Promise<readonly VehicleCatalogOption[]>;
  listCatalogVersions: (
    context: ServiceContext,
    input: ListVehicleCatalogVersionsInput,
  ) => Promise<readonly VehicleCatalogVersionOption[]>;
  listCatalogYears: (
    context: ServiceContext,
    input: ListVehicleCatalogYearsInput,
  ) => Promise<readonly VehicleCatalogYearOption[]>;
  requestMediaUpload: (
    context: ServiceContext,
    input: RequestVehicleMediaUploadInput,
  ) => Promise<VehicleMediaUpload>;
  reorderMedia: (
    context: ServiceContext,
    input: ReorderVehicleMediaInput,
  ) => Promise<InventoryListingDetailResponse>;
  requestDocumentUpload: (
    context: ServiceContext,
    input: RequestVehicleDocumentUploadInput,
  ) => Promise<VehicleMediaUpload>;
  unpublishListing: (
    context: ServiceContext,
    input: UnpublishVehicleListingInput,
  ) => Promise<InventoryListingDetailResponse>;
  reserveUnit: (
    context: ServiceContext,
    input: ReserveVehicleUnitInput,
  ) => Promise<InventoryListingDetailResponse>;
  releaseUnitReservation: (
    context: ServiceContext,
    input: ReleaseVehicleUnitReservationInput,
  ) => Promise<InventoryListingDetailResponse>;
  updateListingDescription: (
    context: ServiceContext,
    input: { description: string | null; listingId: string },
  ) => Promise<InventoryListingDetailResponse>;
  updateListingPrice: (
    context: ServiceContext,
    input: { listingId: string; priceCents: number | null },
  ) => Promise<InventoryListingDetailResponse>;
  updateListingDetails: (
    context: ServiceContext,
    input: UpdateVehicleListingDetailsInput,
  ) => Promise<InventoryListingDetailResponse>;
  updateMedia: (
    context: ServiceContext,
    input: UpdateVehicleMediaInput,
  ) => Promise<InventoryListingDetailResponse>;
  updateListingUnit: (
    context: ServiceContext,
    input: UpdateVehicleUnitInput,
  ) => Promise<InventoryListingDetailResponse>;
  updateChecklist: (
    context: ServiceContext,
    input: UpdateVehicleChecklistInput,
  ) => Promise<InventoryListingDetailResponse>;
  updateVehicleSupplier: (
    context: ServiceContext,
    input: UpdateVehicleSupplierInput,
  ) => Promise<VehicleSupplier>;
  upsertVehicleUnitAcquisition: (
    context: ServiceContext,
    input: VehicleUnitAcquisitionInput,
  ) => Promise<VehicleUnitAcquisition>;
  sellUnit: (
    context: ServiceContext,
    input: SellVehicleUnitInput,
  ) => Promise<InventoryListingDetailResponse>;
};
export const inventoryListingServices = createInventoryListingServices();
export { createInventoryListingServices };
