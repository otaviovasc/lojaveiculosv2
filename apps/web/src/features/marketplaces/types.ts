export type MarketplaceAuth = {
  accessToken?: string;
  clerkUserId?: string;
  storeSlug?: string;
};

export type MarketplaceProvider = "mercado_livre" | "olx";
export type MarketplaceAccountStatus = "active" | "error" | "inactive";
export type MarketplaceJobStatus =
  | "cancelled"
  | "failed"
  | "queued"
  | "running"
  | "succeeded";
export type MarketplaceSyncJobType =
  | "inventory_sync"
  | "lead_sync"
  | "listing_publish"
  | "listing_unpublish"
  | "listing_update";

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

export type MarketplaceJob = {
  accountId: string;
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  jobType: MarketplaceSyncJobType;
  metadata: Record<string, unknown>;
  provider: MarketplaceProvider;
  status: MarketplaceJobStatus;
};

export type MarketplaceOverview = {
  accounts: readonly MarketplaceAccount[];
  jobs: readonly MarketplaceJob[];
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
  metadata?: Record<string, unknown>;
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
