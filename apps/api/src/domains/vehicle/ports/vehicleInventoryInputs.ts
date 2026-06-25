import type {
  VehicleDocument,
  VehicleDocumentKind,
  VehicleDocumentTargetType,
  VehicleColor,
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
  VehicleListingCatalog,
  VehicleFuelType,
  VehicleListingStatus,
  VehicleMediaKind,
  VehicleTransmission,
  VehicleUnitStatus,
} from "./vehicleInventoryTypes.js";

export type CreateVehicleListingRecord = {
  catalog: VehicleListingCatalog | null;
  description: string | null;
  doors?: number | null;
  engineAspiration?: VehicleEngineAspiration | null;
  engineDisplacement?: VehicleEngineDisplacement | null;
  fuelType?: VehicleFuelType | null;
  internalNotes?: string | null;
  manufactureYear: number | null;
  mileageKm?: number | null;
  modelYear: number | null;
  plate: string | null;
  priceCents: number | null;
  status: VehicleListingStatus;
  storeId: string | null;
  tenantId: string | null;
  title: string;
  transmission?: VehicleTransmission | null;
  trimName: string | null;
};

export type CreateVehicleUnitRecord = {
  colorName?: VehicleColor | null;
  listingId: string;
  plate: string | null;
  status: VehicleUnitStatus;
  stockNumber: string | null;
  storeId: string | null;
  tenantId: string | null;
  vin: string | null;
};

export type CreateVehicleMediaRecord = {
  altText: string | null;
  displayOrder: number;
  isPublic: boolean;
  kind: VehicleMediaKind;
  listingId: string;
  storageKey: string;
  storeId: string | null;
  tenantId: string | null;
  url: string;
};

export type CreateVehicleDocumentRecord = {
  createdByUserId: string | null;
  fileName: string;
  fileSizeBytes: number | null;
  kind: VehicleDocumentKind;
  linkRole: string;
  metadata?: Record<string, unknown> | undefined;
  mimeType: string | null;
  status: VehicleDocument["status"];
  storageKey: string;
  storeId: string | null;
  targetId: string;
  targetType: VehicleDocumentTargetType;
  tenantId: string | null;
  title: string;
};

export type FindVehicleListingInput = {
  listingId: string;
  storeId: string | null;
  tenantId: string | null;
};

export type FindVehicleUnitInput = {
  listingId: string;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
};

export type FindVehicleMediaInput = {
  listingId: string;
  mediaId: string;
  storeId: string | null;
  tenantId: string | null;
};

export type ListVehicleListingsInput = {
  limit: number;
  offset: number;
  search: string | null;
  status: VehicleListingStatus | null;
  storeId: string | null;
  tenantId: string | null;
};

export type ListVehicleChildrenInput = {
  listingIds: readonly string[];
  storeId: string | null;
  tenantId: string | null;
};

export type ListVehicleDocumentsInput = {
  listingId: string;
  storeId: string | null;
  tenantId: string | null;
  unitIds: readonly string[];
};
