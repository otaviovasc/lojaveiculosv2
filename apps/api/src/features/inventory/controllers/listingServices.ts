import type { AttachVehicleDocumentInput } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import type { AttachVehicleUnitInput } from "../../../domains/vehicle/services/VehicleService/attachVehicleUnit.js";
import type { AddVehicleCostInput } from "../../../domains/vehicle/services/VehicleService/addVehicleCost.js";
import type { CreateVehicleListingInput } from "../../../domains/vehicle/services/VehicleService/createVehicleListing.js";
import type { CreateVehicleMediaInput } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import type { DeleteVehicleMediaInput } from "../../../domains/vehicle/services/VehicleService/deleteVehicleMedia.js";
import type { ListVehicleListingsInput } from "../../../domains/vehicle/services/VehicleService/listVehicleListings.js";
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
import type { ReserveVehicleListingInput } from "../../../domains/vehicle/services/VehicleService/reserveVehicleListing.js";
import type { ReleaseVehicleReservationInput } from "../../../domains/vehicle/services/VehicleService/releaseVehicleReservation.js";
import type { RequestVehicleDocumentUploadInput } from "../../../domains/vehicle/services/VehicleService/requestVehicleDocumentUpload.js";
import type { RequestVehicleMediaUploadInput } from "../../../domains/vehicle/services/VehicleService/requestVehicleMediaUpload.js";
import type { SellVehicleListingInput } from "../../../domains/vehicle/services/VehicleService/sellVehicleListing.js";
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
} from "./listingResponseDtos.js";
import { createInventoryListingServices } from "./listingServicesFactory.js";
export type {
  CreateInventoryListingServicesOptions,
  DrizzleVehicleInventoryAdapter,
} from "./listingServiceOptions.js";

export const listingStatuses = [
  "archived",
  "draft",
  "in_preparation",
  "published",
  "sold_out",
  "unpublished",
] as const;

export type VehicleMediaResult = {
  listingId: string;
  mediaId: string;
  storageKey: string;
  status: "created";
  url: string;
};

export type InventoryListingServices = {
  archiveVehicleSupplier: (
    context: ServiceContext,
    input: { supplierId: string },
  ) => Promise<VehicleSupplier>;
  attachListingUnit: (
    context: ServiceContext,
    input: AttachListingInput,
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
  getVehicleUnitAcquisition: (
    context: ServiceContext,
    input: { listingId: string; unitId: string },
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
  reserveListing: (
    context: ServiceContext,
    input: ReserveVehicleListingInput,
  ) => Promise<InventoryListingDetailResponse>;
  releaseReservation: (
    context: ServiceContext,
    input: ReleaseVehicleReservationInput,
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
  sellListing: (
    context: ServiceContext,
    input: SellVehicleListingInput,
  ) => Promise<InventoryListingDetailResponse>;
};

type AttachListingInput = {
  colorName?: AttachVehicleUnitInput["colorName"] | undefined;
  listingId: string;
  plate?: string | null | undefined;
  stockNumber?: string | null | undefined;
  vin?: string | null | undefined;
};

type CreateListingInput = {
  catalog?: CreateVehicleListingInput["catalog"] | undefined;
  description?: string | null | undefined;
  doors?: CreateVehicleListingInput["doors"] | undefined;
  engineAspiration?: CreateVehicleListingInput["engineAspiration"];
  engineDisplacement?: CreateVehicleListingInput["engineDisplacement"];
  fuelType?: CreateVehicleListingInput["fuelType"];
  internalNotes?: CreateVehicleListingInput["internalNotes"];
  manufactureYear?: number | null | undefined;
  mileageKm?: CreateVehicleListingInput["mileageKm"] | undefined;
  modelYear?: number | null | undefined;
  plate: string | null;
  priceCents?: number | null | undefined;
  status?: VehicleListingStatus | undefined;
  title: string;
  transmission?: CreateVehicleListingInput["transmission"];
  trimName?: string | null | undefined;
};

export const inventoryListingServices = createInventoryListingServices();
export { createInventoryListingServices };
