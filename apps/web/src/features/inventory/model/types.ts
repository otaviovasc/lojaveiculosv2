import type {
  InventoryCatalogSnapshot,
  InventoryDocumentKind,
  InventoryDocumentTargetType,
  InventoryListingStatus,
  InventoryMediaKind,
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
  InventoryDocumentKind,
  InventoryDocumentTargetType,
  InventoryListingStatus,
  InventoryMediaKind,
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
  unitId: string;
};

export type SellInventoryListingInput = {
  buyer: InventoryBuyerInput;
  paidAmountCents?: number | null;
  paymentMethod?: string;
  reason?: string | null;
  salePriceCents?: number | null;
  unitId: string;
};

export type InventoryListing = {
  catalog: InventoryCatalogSnapshot | null;
  createdAt: string;
  description: string | null;
  id: string;
  manufactureYear: number | null;
  modelYear: number | null;
  plate: string | null;
  priceCents: number | null;
  status: InventoryListingStatus;
  storeId: string | null;
  tenantId: string | null;
  title: string;
  trimName: string | null;
  unitIds: readonly string[];
  updatedAt: string;
};

export type InventoryUnit = {
  createdAt: string;
  id: string;
  listingId: string;
  plate: string | null;
  status: "available" | "reserved" | "retired" | "sold";
  stockNumber: string | null;
  storeId: string | null;
  tenantId: string | null;
  updatedAt: string;
  vin: string | null;
};

export type InventoryListingDetail = {
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
  manufactureYear?: number | null;
  modelYear?: number | null;
  plate: string | null;
  priceCents?: number | null;
  status?: InventoryListingStatus;
  title: string;
  trimName?: string | null;
};

export type CreateInventoryUnitInput = {
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
  targetId?: string;
  targetType?: InventoryDocumentTargetType;
  title: string;
};

export type CreateInventoryFlowInput = {
  listing: CreateInventoryListingInput;
  media?: CreateInventoryMediaInput & { file: File };
  unit: CreateInventoryUnitInput;
};

export type UpdateInventoryListingInput = {
  catalog?: InventoryCatalogSnapshot | null;
  description?: string | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
  priceCents?: number | null;
  status?: InventoryListingStatus;
  title?: string;
  trimName?: string | null;
};

export type UpdateInventoryUnitInput = {
  plate?: string | null;
  status?: InventoryUnit["status"];
  stockNumber?: string | null;
  vin?: string | null;
};

export type CreateInventoryFlowResult = {
  listing: InventoryListingDetail;
  media?: InventoryMediaRecord;
  upload?: InventoryMediaUpload;
  unit: InventoryListingDetail;
};
