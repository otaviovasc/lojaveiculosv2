import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { OlxCapabilityResult } from "./marketplaceOlxCrmOnboarding.js";
import type { MarketplaceServiceErrorCode } from "./marketplaceErrorCodes.js";
import type {
  MarketplaceCatalogSnapshot,
  MarketplaceListingProjection,
} from "./marketplaceListingProjection.js";
import type {
  MarketplaceJobScope,
  MarketplaceReconciliationRepository,
} from "./marketplaceReconciliationRepository.js";
export type {
  MarketplaceJobScope,
  MarketplaceReconciliationClaim,
} from "./marketplaceReconciliationRepository.js";
export type { MarketplaceServiceErrorCode } from "./marketplaceErrorCodes.js";
export type {
  MarketplaceCatalogSnapshot,
  MarketplaceListingProjection,
} from "./marketplaceListingProjection.js";
export { MarketplaceAccountMissingError } from "./marketplaceRepositoryErrors.js";
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
  "cancelled" | "failed" | "queued" | "running" | "submitted" | "succeeded";
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
  capabilities: {
    chat: OlxCapabilityResult;
    leads: OlxCapabilityResult;
    stock: OlxCapabilityResult;
  } | null;
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
  providerAccountId?: string | null;
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

export type MarketplaceRepository = MarketplaceReconciliationRepository & {
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
  findAccountById: (input: {
    accountId: string;
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
  listActiveSyncJobs: (input: {
    listingIds?: readonly string[];
    provider: MarketplaceProvider;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob[]>;
  listProviderListings: (input: {
    accountId: string;
    listingIds?: readonly string[];
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceProviderListing[]>;
  markJobCompleted: (input: {
    completedAt: Date;
    dispatchLeaseOwner: string;
    externalId?: string | null;
    jobId: string;
    metadata?: Record<string, unknown>;
    provider: MarketplaceProvider;
    listingId?: string | null;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob | null>;
  markJobFailed: (input: {
    completedAt: Date;
    dispatchLeaseOwner: string;
    errorMessage: string;
    jobId: string;
    metadata?: Record<string, unknown>;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob | null>;
  markJobRunning: (input: {
    dispatchLeaseExpiresAt: Date;
    dispatchLeaseOwner: string;
    jobId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob | null>;
  markJobSubmitted: (input: {
    dispatchLeaseOwner: string;
    jobId: string;
    metadata: Record<string, unknown>;
    nextAttemptAt: Date;
    operationExpiresAt: Date | null;
    operationToken: string | null;
    provider: MarketplaceProvider;
    listingId: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceJob | null>;
  recoverStaleRunningJobs: (input: {
    limit: number;
    now: Date;
    scope: MarketplaceJobScope;
  }) => Promise<MarketplaceJob[]>;
  listOverview: (input: {
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<MarketplaceOverview>;
  upsertAccount: (
    input: UpsertMarketplaceAccountInput,
  ) => Promise<MarketplaceAccount>;
};
