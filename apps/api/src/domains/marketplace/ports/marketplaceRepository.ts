import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { MarketplaceServiceErrorCode } from "./marketplaceErrorCodes.js";
export type { MarketplaceServiceErrorCode } from "./marketplaceErrorCodes.js";
export type MarketplaceProvider = "mercado_livre" | "olx";
export type MarketplaceAccountStatus = "active" | "error" | "inactive";
export type MarketplaceAccountConnectionStatus =
  | "blocked"
  | "connected"
  | "degraded"
  | "not_configured"
  | "not_connected"
  | "paused"
  | "reconnect_required"
  | "refreshable";
export type MarketplaceJobStatus =
  "cancelled" | "failed" | "queued" | "running" | "succeeded";
export type MarketplaceSyncJobType =
  | "inventory_sync"
  | "lead_sync"
  | "listing_publish"
  | "listing_unpublish"
  | "listing_update";
export type MarketplaceRequirementStatus = "blocked" | "ok" | "warning";

export type MarketplaceAccount = {
  config: Record<string, unknown>;
  createdAt: Date;
  id: string;
  provider: MarketplaceProvider;
  status: MarketplaceAccountStatus;
  storeId: StoreId;
  tenantId: TenantId;
  updatedAt: Date;
};

export type MarketplaceJob = {
  accountId: string;
  completedAt: Date | null;
  createdAt: Date;
  errorMessage: string | null;
  id: string;
  jobType: MarketplaceSyncJobType;
  metadata: Record<string, unknown>;
  provider: MarketplaceProvider;
  status: MarketplaceJobStatus;
};

export type MarketplaceProviderListing = {
  accountId: string;
  externalId: string | null;
  listingId: string;
  metadata: Record<string, unknown>;
  storeId: StoreId;
  tenantId: TenantId;
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

export type MarketplaceSelectedMedia = {
  altText: string | null;
  url: string;
};

export type MarketplaceListingProjection = {
  catalog: MarketplaceCatalogSnapshot | null;
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
  listingId: string;
  mediaUrls: readonly string[];
  mileageKm: number | null;
  modelYear: number | null;
  priceCents: number | null;
  publicSlug: string | null;
  selectedMedia: readonly MarketplaceSelectedMedia[];
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

export type MarketplaceAccountRequirement = {
  code: MarketplaceServiceErrorCode;
  message: string;
  severity: MarketplaceRequirementStatus;
  userAction: string;
};

export type MarketplaceProviderState = {
  accountId: string | null;
  connectionStatus: MarketplaceAccountConnectionStatus;
  lastSyncSummary: MarketplaceStockSyncSummary | null;
  provider: MarketplaceProvider;
  requirements: MarketplaceAccountRequirement[];
};

export type MarketplaceOverview = {
  accounts: readonly MarketplaceAccount[];
  jobs: readonly MarketplaceJob[];
  providerStates: readonly MarketplaceProviderState[];
  providers: readonly MarketplaceProvider[];
  storeId: StoreId;
  tenantId: TenantId;
};

export type MarketplaceCatalogMapping = {
  fipeBrandCode: string;
  fipeCode: string;
  fipeModelCode: string;
  fipeYearCode: string;
  provider: MarketplaceProvider;
  providerBrandCode: string | null;
  providerModelCode: string | null;
  providerTrimCode: string | null;
  providerYearCode: string | null;
  status: "resolved" | "unresolved";
  unresolvedReason: string | null;
  vehicleType: "cars" | "motorcycles" | "trucks";
};

export type UpsertMarketplaceAccountInput = {
  config: Record<string, unknown>;
  provider: MarketplaceProvider;
  status: MarketplaceAccountStatus;
  storeId: StoreId;
  tenantId: TenantId;
};

export type CreateMarketplaceJobInput = {
  jobType: MarketplaceSyncJobType;
  metadata: Record<string, unknown>;
  provider: MarketplaceProvider;
  storeId: StoreId;
  tenantId: TenantId;
};

export type MarketplaceRepository = {
  createSyncJob: (input: CreateMarketplaceJobInput) => Promise<MarketplaceJob>;
  findSyncJob: (input: {
    jobId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob | null>;
  findAccount: (input: {
    provider: MarketplaceProvider;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceAccount | null>;
  findListingProjection: (input: {
    listingId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceListingProjection | null>;
  findCatalogMapping: (input: {
    catalog: MarketplaceCatalogSnapshot;
    provider: MarketplaceProvider;
  }) => Promise<MarketplaceCatalogMapping | null>;
  findProviderListing: (input: {
    accountId: string;
    listingId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceProviderListing | null>;
  listListingProjections: (input: {
    listingIds?: readonly string[];
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceListingProjection[]>;
  markJobCompleted: (input: {
    completedAt: Date;
    externalId?: string | null;
    jobId: string;
    metadata?: Record<string, unknown>;
    provider: MarketplaceProvider;
    listingId?: string | null;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob>;
  markJobFailed: (input: {
    completedAt: Date;
    errorMessage: string;
    jobId: string;
    metadata?: Record<string, unknown>;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob>;
  markJobRunning: (input: {
    jobId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob>;
  listOverview: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceOverview>;
  upsertAccount: (
    input: UpsertMarketplaceAccountInput,
  ) => Promise<MarketplaceAccount>;
};

export class MarketplaceAccountMissingError extends Error {
  constructor(provider: MarketplaceProvider) {
    super(`Marketplace account is not configured for ${provider}.`);
    this.name = "MarketplaceAccountMissingError";
  }
}
