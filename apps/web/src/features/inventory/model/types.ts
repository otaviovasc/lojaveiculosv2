import type { VehicleColor } from "@lojaveiculosv2/shared";
import type {
  InventoryCatalogSnapshot,
  InventoryDocumentKind,
  InventoryDocumentTargetType,
  InventoryEngineAspiration,
  InventoryEngineDisplacement,
  InventoryFuelType,
  InventoryCreateListingStatus,
  InventoryListingStatus,
  InventoryMediaKind,
  InventoryTransmission,
} from "./catalogTypes";
import type {
  InventoryDocument,
  InventoryMedia,
  InventoryMediaRecord,
  InventoryMediaUpload,
} from "./mediaDocumentTypes";
import type {
  InventoryCost,
  InventoryPriceHistoryEntry,
  InventoryStatusHistoryEntry,
} from "./operationTypes";

export type {
  InventoryCatalogOption,
  InventoryCatalogSnapshot,
  InventoryCatalogVehicleType,
  InventoryCatalogVersionOption,
  InventoryCatalogYearOption,
  InventoryCreateListingStatus,
  InventoryDocumentKind,
  InventoryDocumentTargetType,
  InventoryEngineAspiration,
  InventoryEngineDisplacement,
  InventoryFuelType,
  InventoryListingStatus,
  InventoryMediaKind,
  InventoryTransmission,
} from "./catalogTypes";
export type {
  InventoryDocument,
  InventoryMedia,
  InventoryMediaRecord,
  InventoryMediaUpload,
} from "./mediaDocumentTypes";
export type {
  CreateInventoryCostInput,
  InventoryCostKind,
} from "./operationTypes";
export type {
  CreateVehicleSupplierInput,
  UpdateVehicleSupplierInput,
  UpsertVehicleUnitAcquisitionInput,
  VehicleAcquisitionChannel,
  VehicleAcquisitionCommissionTiming,
  VehicleSupplier,
  VehicleSupplierKind,
  VehicleUnitAcquisition,
} from "./acquisitionTypes";
export type { VehicleColor as InventoryVehicleColor };

export type InventoryBuyerInput = {
  address?: string | null;
  document?: string | null;
  email?: string | null;
  name: string;
  phone?: string | null;
};

export type ReserveInventoryListingInput = {
  buyer: InventoryBuyerInput;
  paymentMethod?: string;
  reason?: string | null;
  salePriceCents?: number | null;
  signalAmountCents: number;
  unitId?: string;
};

export type SellInventoryListingInput = {
  buyer: InventoryBuyerInput;
  paidAmountCents?: number | null;
  paymentMethod?: string;
  reason?: string | null;
  salePriceCents?: number | null;
  unitId?: string;
};

export type ReleaseInventoryReservationInput = {
  reason?: string | null;
  saleId?: string | null;
};

export type InventoryListing = {
  catalog: InventoryCatalogSnapshot | null;
  createdAt: string;
  description: string | null;
  doors: number | null;
  engineAspiration: InventoryEngineAspiration | null;
  engineDisplacement: InventoryEngineDisplacement | null;
  fuelType: InventoryFuelType | null;
  id: string;
  internalNotes: string | null;
  manufactureYear: number | null;
  mileageKm: number | null;
  modelYear: number | null;
  plate: string | null;
  priceCents: number | null;
  publicSlug: string | null;
  status: InventoryListingStatus;
  storeId: string | null;
  tenantId: string | null;
  title: string;
  transmission: InventoryTransmission | null;
  trimName: string | null;
  unitIds: readonly string[];
  updatedAt: string;
};

export type InventoryUnit = {
  colorName: VehicleColor | null;
  createdAt: string;
  id: string;
  listingId: string;
  plate: string | null;
  status:
    | "acquired"
    | "available"
    | "delivered"
    | "inactive"
    | "in_preparation"
    | "reserved"
    | "sold";
  stockNumber: string | null;
  storeId: string | null;
  tenantId: string | null;
  updatedAt: string;
  vin: string | null;
};

export type InventoryUnitStatus = InventoryUnit["status"];

export type InventoryChecklistStatus =
  "failed" | "in_progress" | "passed" | "pending" | "waived";

export type InventoryChecklistItemStatus =
  "failed" | "passed" | "pending" | "waived";

export type InventoryChecklistItem = {
  id: string;
  label: string;
  notes: string | null;
  status: InventoryChecklistItemStatus;
};

export type InventoryChecklist = {
  completedAt: string | null;
  completedByUserId: string | null;
  createdAt: string;
  id: string;
  items: readonly InventoryChecklistItem[];
  name: string;
  status: InventoryChecklistStatus;
  storeId: string | null;
  tenantId: string | null;
  unitId: string;
  updatedAt: string;
};

export type InventoryListingDetail = {
  checklists: readonly InventoryChecklist[];
  costs: readonly InventoryCost[];
  documents: readonly InventoryDocument[];
  listing: InventoryListing;
  media: readonly InventoryMedia[];
  priceHistory: readonly InventoryPriceHistoryEntry[];
  status: "ready";
  statusHistory: readonly InventoryStatusHistoryEntry[];
  units: readonly InventoryUnit[];
};

export type InventoryListingSummary = {
  listing: InventoryListing;
  mediaCount: number;
  primaryMediaUrl: string | null;
  primaryUnit: InventoryUnit | null;
  units: readonly InventoryUnit[];
};

export type InventoryListingList = {
  hasMore: boolean;
  items: readonly InventoryListingSummary[];
  nextOffset: number | null;
  total: number;
};

export type InventoryAuth = {
  accessToken?: string | null;
  clerkUserId?: string | null;
  storeSlug?: string | null;
};

export type CreateInventoryListingInput = {
  catalog?: InventoryCatalogSnapshot | null;
  description?: string | null;
  doors?: number | null;
  engineAspiration?: InventoryEngineAspiration | null;
  engineDisplacement?: InventoryEngineDisplacement | null;
  fuelType?: InventoryFuelType | null;
  internalNotes?: string | null;
  manufactureYear?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
  plate: string | null;
  priceCents?: number | null;
  status?: InventoryCreateListingStatus;
  title: string;
  transmission?: InventoryTransmission | null;
  trimName?: string | null;
};

export type CreateInventoryUnitInput = {
  colorName?: VehicleColor | null;
  plate?: string | null;
  stockNumber?: string | null;
  vin?: string | null;
};

export type CreateInventoryMediaInput = {
  altText?: string | null;
  displayOrder?: number;
  kind: InventoryMediaKind;
};

export type UpdateInventoryMediaInput = {
  altText?: string | null;
  displayOrder?: number;
  isPublic?: boolean;
};

export type AttachInventoryDocumentInput = {
  fileName: string;
  fileSizeBytes?: number | null;
  kind: InventoryDocumentKind;
  mimeType?: string | null;
  storageKey: string;
  title: string;
};

export type CreateInventoryFlowInput = {
  listing: CreateInventoryListingInput;
  media?: CreateInventoryMediaInput & { file: File };
  unit: CreateInventoryUnitInput;
  units?: readonly CreateInventoryUnitInput[];
};

export type UpdateInventoryListingInput = {
  catalog?: InventoryCatalogSnapshot | null;
  description?: string | null;
  doors?: number | null;
  engineAspiration?: InventoryEngineAspiration | null;
  engineDisplacement?: InventoryEngineDisplacement | null;
  fuelType?: InventoryFuelType | null;
  internalNotes?: string | null;
  manufactureYear?: number | null;
  mileageKm?: number | null;
  modelYear?: number | null;
  priceCents?: number | null;
  status?: InventoryListingStatus;
  title?: string;
  transmission?: InventoryTransmission | null;
  trimName?: string | null;
};

export type UpdateInventoryUnitInput = {
  colorName?: VehicleColor | null;
  plate?: string | null;
  status?: InventoryUnit["status"];
  stockNumber?: string | null;
  vin?: string | null;
};

export type UpsertInventoryChecklistItemInput = {
  id?: string;
  label: string;
  notes?: string | null;
  status?: InventoryChecklistItemStatus;
};

export type CreateInventoryChecklistInput = {
  items: readonly UpsertInventoryChecklistItemInput[];
  name: string;
  status?: InventoryChecklistStatus;
};

export type UpdateInventoryChecklistInput = {
  items?: readonly UpsertInventoryChecklistItemInput[];
  name?: string;
  status?: InventoryChecklistStatus;
};

export type CreateInventoryFlowResult = {
  listing: InventoryListingDetail;
  media?: InventoryMediaRecord;
  upload?: InventoryMediaUpload;
  unit: InventoryListingDetail;
};
