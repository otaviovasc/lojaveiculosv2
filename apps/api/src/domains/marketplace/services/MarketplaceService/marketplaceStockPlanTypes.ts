import type {
  MarketplaceListingProjection,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";

export type MarketplaceStockPlanDecision =
  "blocked" | "no_op" | "pending" | "publish" | "unpublish" | "update";

export type MarketplaceStockAccountingStatus =
  "excluded" | "needs_correction" | "processing" | "ready";

export type MarketplaceBlockerLayer =
  "catalog" | "connection" | "listing" | "provider" | "store";

export type MarketplaceListingBlockerCode =
  | "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING"
  | "MARKETPLACE_LISTING_CONTACT_PHONE_MISSING"
  | "MARKETPLACE_LISTING_FIPE_CATALOG_MISSING"
  | "MARKETPLACE_LISTING_LICENSE_PLATE_MISSING"
  | "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING"
  | "MARKETPLACE_LISTING_MAPPING_REQUIRED"
  | "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS"
  | "MARKETPLACE_LISTING_NOT_PUBLIC"
  | "MARKETPLACE_LISTING_OLX_NOT_QUERIED"
  | "MARKETPLACE_LISTING_PHOTOS_INVALID"
  | "MARKETPLACE_LISTING_PRICE_MISSING"
  | "MARKETPLACE_LISTING_PROVIDER_NOT_QUERIED"
  | "MARKETPLACE_LISTING_TEXT_INVALID"
  | "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING";

export type MarketplaceListingBlocker = {
  code: MarketplaceListingBlockerCode;
  field?: string;
  layer: MarketplaceBlockerLayer;
  message: string;
  userAction: string;
};

export type MarketplaceStockPlanItem = {
  accountingStatus: MarketplaceStockAccountingStatus;
  blockers: MarketplaceListingBlocker[];
  decision: MarketplaceStockPlanDecision;
  externalId: string | null;
  jobType: "listing_publish" | "listing_unpublish" | "listing_update" | null;
  listing: MarketplaceListingProjection;
  origin: "provider_only" | "stock";
  provider: MarketplaceProvider;
  providerMapping: {
    providerBrandCode: string;
    providerModelCode: string;
    providerTrimCode: string;
    providerYearCode: string | null;
  } | null;
  reason: string;
  userAction: string | null;
};

export type MarketplaceStockPlan = {
  accounting: {
    excluded: number;
    found: number;
    needsCorrection: number;
    processing: number;
    ready: number;
  };
  blocked: number;
  items: MarketplaceStockPlanItem[];
  noOp: number;
  pending: number;
  publish: number;
  total: number;
  unpublish: number;
  update: number;
};
