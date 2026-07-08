import type { MarketplaceJob, MarketplaceProvider } from "./typesCore";

export type MarketplaceStockSyncSummary = {
  batchId: string | null;
  blocked: number;
  failed: number;
  noOp: number;
  publish: number;
  queued: number;
  succeeded: number;
  total: number;
  unpublish: number;
  update: number;
};

export type MarketplaceCatalogSnapshot = {
  brandCode: string | null;
  brandName: string | null;
  fipeCode: string | null;
  fuel: string | null;
  modelCode: string | null;
  modelName: string | null;
  modelYear: number | null;
  referenceMonth: string | null;
  source: "fipe" | null;
  vehicleType: "cars" | "motorcycles" | "trucks" | null;
  yearCode: string | null;
  yearName: string | null;
};

export type MarketplaceListingProjection = {
  catalog: MarketplaceCatalogSnapshot | null;
  condition: "certified_pre_owned" | "new" | "used";
  contactPhone: string | null;
  description: string | null;
  doors: number | null;
  fuelType:
    | "diesel"
    | "electric"
    | "ethanol"
    | "flex"
    | "gasoline"
    | "hybrid"
    | "other"
    | null;
  isVisibleOnPublicSite: boolean;
  licensePlate: string | null;
  listingId: string;
  locationZipCode: string | null;
  mediaUrls: readonly string[];
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  publicSlug: string | null;
  selectedMedia: readonly { altText: string | null; url: string }[];
  selectedUnitId: string | null;
  status:
    | "archived"
    | "draft"
    | "in_preparation"
    | "published"
    | "sold_out"
    | "unpublished";
  stockLabel: string | null;
  title: string;
  trimName: string | null;
  vehicleType: "cars" | "motorcycles" | "trucks" | null;
};

export type MarketplaceStockPlanDecision =
  "publish" | "update" | "unpublish" | "no_op" | "blocked";

export type MarketplaceListingBlockerCode =
  | "MARKETPLACE_LISTING_NOT_PUBLIC"
  | "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS"
  | "MARKETPLACE_LISTING_PRICE_MISSING"
  | "MARKETPLACE_LISTING_FIPE_CATALOG_MISSING"
  | "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING"
  | "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING"
  | "MARKETPLACE_LISTING_CONTACT_PHONE_MISSING"
  | "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING"
  | "MARKETPLACE_LISTING_LICENSE_PLATE_MISSING"
  | "MARKETPLACE_LISTING_MAPPING_REQUIRED";

export type MarketplaceListingBlocker = {
  code: MarketplaceListingBlockerCode;
  field?: string;
  message: string;
  userAction: string;
};

export type MarketplaceStockPlanItem = {
  blockers: MarketplaceListingBlocker[];
  decision: MarketplaceStockPlanDecision;
  externalId: string | null;
  jobType: "listing_publish" | "listing_update" | "listing_unpublish" | null;
  listing: MarketplaceListingProjection;
  provider: MarketplaceProvider;
};

export type MarketplaceStockPlan = {
  blocked: number;
  items: MarketplaceStockPlanItem[];
  noOp: number;
  publish: number;
  total: number;
  unpublish: number;
  update: number;
};

export type MarketplaceStockSyncPreviewRequest = {
  listingIds?: string[];
  provider: MarketplaceProvider;
};

export type MarketplaceStockSyncPreviewResponse = {
  batchId: string;
  plan: MarketplaceStockPlan;
  provider: MarketplaceProvider;
};

export type MarketplaceStockSyncRunRequest = {
  batchId?: string;
  listingIds?: string[];
  provider: MarketplaceProvider;
};

export type MarketplaceStockSyncRunResponse = {
  batchId: string;
  createdJobs: MarketplaceJob[];
  plan: MarketplaceStockPlan;
  provider: MarketplaceProvider;
};

export type MarketplaceSyncJobRetryRequest = {
  reason?: string;
};

export type MarketplaceSyncJobRetryResponse = {
  job: MarketplaceJob;
  previousJobId: string;
};
