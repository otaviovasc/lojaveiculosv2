import type {
  MarketplaceStockPlanDecision,
  MarketplaceStockSyncSummary,
} from "./typesStockSync";

export type MarketplaceAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type MarketplaceProvider = "mercado_livre" | "olx";
export type MarketplaceAccountStatus = "active" | "error" | "inactive";

export type MarketplaceAccountConnectionStatus =
  | "not_configured"
  | "not_connected"
  | "paused"
  | "connected"
  | "refreshable"
  | "reconnect_required"
  | "blocked"
  | "degraded";

export type MarketplaceRequirementStatus = "blocked" | "ok" | "warning";

export type MarketplaceServiceErrorCode =
  | "MARKETPLACE_ACCOUNT_NOT_CONNECTED"
  | "MARKETPLACE_ACCOUNT_PAUSED"
  | "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED"
  | "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED"
  | "MARKETPLACE_LISTING_NOT_READY"
  | "MARKETPLACE_LISTING_NOT_FOUND"
  | "MARKETPLACE_LISTING_MAPPING_REQUIRED"
  | "MARKETPLACE_PROVIDER_NOT_CONFIGURED"
  | "MARKETPLACE_PROVIDER_CONTRACT_MISSING"
  | "MARKETPLACE_PROVIDER_VALIDATION_FAILED"
  | "MARKETPLACE_PROVIDER_CONFLICT"
  | "MARKETPLACE_PROVIDER_RATE_LIMITED"
  | "MARKETPLACE_PROVIDER_UNAVAILABLE"
  | "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED"
  | "MARKETPLACE_TOKEN_REFRESH_FAILED"
  | "MARKETPLACE_SYNC_JOB_INVALID_METADATA"
  | "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE"
  | "MARKETPLACE_SYNC_JOB_STALE"
  | "MARKETPLACE_SYNC_PARTIAL_FAILURE"
  | "MARKETPLACE_REQUEST_VALIDATION_FAILED";

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

export type MarketplaceJobStatus =
  "cancelled" | "failed" | "queued" | "running" | "succeeded";

export type MarketplaceSyncJobType =
  "listing_publish" | "listing_unpublish" | "listing_update";

export type MarketplaceAccount = {
  config: Record<string, unknown>;
  createdAt: string;
  id: string;
  provider: MarketplaceProvider;
  status: MarketplaceAccountStatus;
  storeId: string;
  tenantId: string;
  updatedAt: string;
};

export type MarketplaceJobMetadata = {
  batchId?: string;
  externalId?: string;
  listingId?: string;
  planDecision?: MarketplaceStockPlanDecision;
  providerRequest?: {
    attributeIds?: string[];
    categoryId?: string;
  };
  providerResult?: {
    externalId?: string | null;
    providerRequestId?: string | null;
    providerStatus?: string | null;
  };
  retryOfJobId?: string;
  stockSync?: true;
};

export type MarketplaceJob = {
  accountId: string;
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  jobType: MarketplaceSyncJobType;
  metadata: MarketplaceJobMetadata;
  provider: MarketplaceProvider;
  status: MarketplaceJobStatus;
};

export type MarketplaceOverview = {
  accounts: readonly MarketplaceAccount[];
  jobs: readonly MarketplaceJob[];
  providerStates: readonly MarketplaceProviderState[];
  providers: readonly MarketplaceProvider[];
  storeId: string;
  tenantId: string;
};

export type UpsertMarketplaceAccountInput = {
  config?: Record<string, unknown>;
  provider: MarketplaceProvider;
  status: MarketplaceAccountStatus;
};

export type CreateMarketplaceSyncJobInput = {
  jobType: MarketplaceSyncJobType;
  metadata?: MarketplaceJobMetadata;
  provider: MarketplaceProvider;
};

export type MarketplaceConnectUrl = {
  authorizationUrl: string;
  provider: MarketplaceProvider;
};

export type CreateMarketplaceConnectUrlInput = {
  provider: MarketplaceProvider;
  redirectUri: string;
};

export type CompleteMarketplaceConnectionInput = {
  code: string;
  provider: MarketplaceProvider;
  redirectUri: string;
};
