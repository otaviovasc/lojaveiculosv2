import type {
  MarketplaceListingProjection,
  MarketplaceProvider,
} from "../../ports/marketplaceRepository.js";

export type MarketplaceStockPlanDecision =
  "blocked" | "no_op" | "publish" | "unpublish" | "update";

export type MarketplaceListingBlockerCode =
  | "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING"
  | "MARKETPLACE_LISTING_CONTACT_PHONE_MISSING"
  | "MARKETPLACE_LISTING_FIPE_CATALOG_MISSING"
  | "MARKETPLACE_LISTING_LICENSE_PLATE_MISSING"
  | "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING"
  | "MARKETPLACE_LISTING_MAPPING_REQUIRED"
  | "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS"
  | "MARKETPLACE_LISTING_NOT_PUBLIC"
  | "MARKETPLACE_LISTING_PRICE_MISSING"
  | "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING";

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
  jobType: "listing_publish" | "listing_unpublish" | "listing_update" | null;
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
