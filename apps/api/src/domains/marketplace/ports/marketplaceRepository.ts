import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

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

export type MarketplaceListingProjection = {
  description: string | null;
  listingId: string;
  mediaUrls: readonly string[];
  modelYear: number | null;
  priceCents: number | null;
  title: string;
  vehicleType: "cars" | "motorcycles" | "trucks" | null;
};

export type MarketplaceOverview = {
  accounts: readonly MarketplaceAccount[];
  jobs: readonly MarketplaceJob[];
  providers: readonly MarketplaceProvider[];
  storeId: StoreId;
  tenantId: TenantId;
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
