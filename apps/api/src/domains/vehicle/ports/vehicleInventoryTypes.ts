import type {
  VehicleColor,
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";

export type {
  VehicleColor,
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
};

export type VehicleListingStatus =
  | "archived"
  | "draft"
  | "in_preparation"
  | "published"
  | "sold_out"
  | "unpublished";

export type VehicleUnitStatus =
  | "acquired"
  | "available"
  | "delivered"
  | "inactive"
  | "in_preparation"
  | "reserved"
  | "sold";
export type VehicleFuelType =
  | "diesel"
  | "electric"
  | "ethanol"
  | "flex"
  | "gasoline"
  | "hybrid"
  | "other";
export type VehicleTransmission =
  | "automated"
  | "automatic"
  | "cvt"
  | "manual"
  | "other";

export type VehicleMediaKind = "document_preview" | "photo" | "video";

export type VehicleDocumentKind =
  | "buyer_document"
  | "delivery_term"
  | "finance_receipt"
  | "inspection"
  | "internal"
  | "invoice"
  | "other"
  | "power_of_attorney"
  | "reservation_receipt"
  | "sale_receipt"
  | "sale_contract"
  | "test_drive"
  | "vehicle_registration";

export type VehicleDocumentTargetType = "vehicle_listing" | "vehicle_unit";

export type VehicleListingCatalog = {
  brandCode: string | null;
  brandLogoUrl?: string | null;
  brandName: string | null;
  fipeCode: string | null;
  fuel: string | null;
  modelCode: string | null;
  modelName: string | null;
  modelYear: number | null;
  priceCents: number | null;
  referenceMonth: string | null;
  source: "fipe" | null;
  vehicleType: "cars" | "motorcycles" | "trucks" | null;
  yearCode: string | null;
  yearName: string | null;
};

export type VehicleListing = {
  catalog: VehicleListingCatalog | null;
  createdAt: Date;
  description: string | null;
  doors: number | null;
  engineAspiration: VehicleEngineAspiration | null;
  engineDisplacement: VehicleEngineDisplacement | null;
  fuelType: VehicleFuelType | null;
  id: string;
  internalNotes: string | null;
  manufactureYear: number | null;
  mileageKm: number | null;
  modelYear: number | null;
  plate: string | null;
  priceCents: number | null;
  status: VehicleListingStatus;
  storeId: string | null;
  tenantId: string | null;
  title: string;
  transmission: VehicleTransmission | null;
  trimName: string | null;
  unitIds: readonly string[];
  updatedAt: Date;
};

export type VehicleUnit = {
  colorName: VehicleColor | null;
  createdAt: Date;
  id: string;
  listingId: string;
  plate: string | null;
  status: VehicleUnitStatus;
  stockNumber: string | null;
  storeId: string | null;
  tenantId: string | null;
  updatedAt: Date;
  vin: string | null;
};

export type VehicleMedia = {
  altText: string | null;
  createdAt: Date;
  displayOrder: number;
  id: string;
  isPublic: boolean;
  kind: VehicleMediaKind;
  storageKey: string;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
  updatedAt: Date;
  url: string;
};

export type VehicleDocument = {
  createdAt: Date;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  kind: VehicleDocumentKind;
  linkRole: string;
  metadata: Record<string, unknown>;
  mimeType: string | null;
  status:
    | "archived"
    | "draft"
    | "issued"
    | "pending_signature"
    | "signed"
    | "voided";
  storageKey: string;
  storeId: string | null;
  targetId: string;
  targetType: VehicleDocumentTargetType;
  tenantId: string | null;
  title: string;
  updatedAt: Date;
  uploadedAt: Date;
};
