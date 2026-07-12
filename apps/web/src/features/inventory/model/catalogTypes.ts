import type {
  VehicleEngineAspiration,
  VehicleEngineDisplacement,
} from "@lojaveiculosv2/shared";

export type InventoryListingStatus =
  | "archived"
  | "draft"
  | "in_preparation"
  | "published"
  | "sold_out"
  | "unpublished";

export type InventoryCreateListingStatus = Extract<
  InventoryListingStatus,
  "draft" | "in_preparation" | "published" | "unpublished"
>;

export type InventoryFuelType =
  "diesel" | "electric" | "ethanol" | "flex" | "gasoline" | "hybrid" | "other";

export type InventoryTransmission =
  "automated" | "automatic" | "cvt" | "manual" | "other";

export type InventoryEngineAspiration = VehicleEngineAspiration;
export type InventoryEngineDisplacement = VehicleEngineDisplacement;

export type InventoryMediaKind = "document_preview" | "photo" | "video";

export type InventoryDocumentKind =
  | "buyer_document"
  | "delivery_term"
  | "inspection"
  | "internal"
  | "invoice"
  | "other"
  | "power_of_attorney"
  | "reservation_receipt"
  | "sale_contract"
  | "sale_receipt"
  | "test_drive"
  | "vehicle_registration";

export type InventoryDocumentTargetType = "vehicle_unit";
export type InventoryCatalogVehicleType = "cars" | "motorcycles" | "trucks";

export type InventoryCatalogOption = {
  code: string;
  imageUrl?: string | null;
  name: string;
};

export type InventoryCatalogYearOption = InventoryCatalogOption & {
  fuelCode: string | null;
  modelYear: number | null;
};

export type InventoryCatalogVersionOption = InventoryCatalogOption & {
  modelFamilyCode: string;
  modelFamilyName: string;
};

export type InventoryCatalogSnapshot = {
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
  vehicleType: InventoryCatalogVehicleType | null;
  yearCode: string | null;
  yearName: string | null;
};
