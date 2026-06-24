export type VehicleListingStatus =
  | "draft"
  | "available"
  | "reserved"
  | "sold"
  | "inactive";

export type VehicleUnitStatus = "available" | "reserved" | "sold" | "retired";

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
  id: string;
  manufactureYear: number | null;
  modelYear: number | null;
  plate: string | null;
  priceCents: number | null;
  status: VehicleListingStatus;
  storeId: string | null;
  tenantId: string | null;
  title: string;
  trimName: string | null;
  unitIds: readonly string[];
  updatedAt: Date;
};

export type VehicleUnit = {
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
  listingId: string;
  storageKey: string;
  storeId: string | null;
  tenantId: string | null;
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
