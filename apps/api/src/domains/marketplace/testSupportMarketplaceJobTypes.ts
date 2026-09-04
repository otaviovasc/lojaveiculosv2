import type {
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceProviderListing,
  MarketplaceRepository,
} from "./ports/marketplaceRepository.js";

export type InMemoryReconciliation = {
  claim: (
    jobs: readonly MarketplaceJob[],
    accounts: readonly MarketplaceAccount[],
    input: Parameters<MarketplaceRepository["claimSubmittedJobs"]>[0],
  ) => Awaited<ReturnType<MarketplaceRepository["claimSubmittedJobs"]>>;
  clear: (jobId: string) => void;
  dispatch: (jobId: string, owner: string, expiresAt: Date) => void;
  listScopes: (
    jobs: readonly MarketplaceJob[],
    accounts: readonly MarketplaceAccount[],
    input: Parameters<MarketplaceRepository["listProcessableJobScopes"]>[0],
  ) => Awaited<ReturnType<MarketplaceRepository["listProcessableJobScopes"]>>;
  owns: (jobId: string, leaseOwner: string) => boolean;
  ownsDispatch: (jobId: string, owner: string) => boolean;
  recoverStale: (
    jobs: readonly MarketplaceJob[],
    accounts: readonly MarketplaceAccount[],
    input: Parameters<MarketplaceRepository["recoverStaleRunningJobs"]>[0],
  ) => string[];
  reschedule: (
    jobId: string,
    input: { checkedAt: Date; nextAttemptAt: Date | null },
  ) => void;
  submit: (
    jobId: string,
    input: {
      nextAttemptAt: Date;
      operationExpiresAt: Date | null;
      operationToken: string | null;
    },
  ) => void;
};

export type InMemoryMarketplaceJobState = {
  accounts: () => MarketplaceAccount[];
  jobs: () => MarketplaceJob[];
  providerListings: () => MarketplaceProviderListing[];
  reconciliation: InMemoryReconciliation;
  setJobs: (jobs: MarketplaceJob[]) => void;
  setProviderListings: (items: MarketplaceProviderListing[]) => void;
};
