import type {
  MarketplaceAccount,
  MarketplaceCatalogMapping,
  MarketplaceJob,
  MarketplaceProviderListing,
  MarketplaceRepository,
} from "./ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "./ports/marketplaceRepository.js";
import {
  assertScopedMarketplaceJob,
  createResolvedMarketplaceCatalogMapping,
  findMarketplaceJob,
  findScopedMarketplaceJob,
  testMarketplaceProviders,
  toTestMarketplaceJob,
  toTestMarketplaceListing,
  upsertTestProviderListing,
} from "./testSupportMarketplaceRecords.js";

export { createResolvedMarketplaceCatalogMapping };

export function createTestMarketplaceRepository(): MarketplaceRepository {
  let accounts: MarketplaceAccount[] = [];
  let catalogMappings: MarketplaceCatalogMapping[] = [];
  let jobs: MarketplaceJob[] = [];
  let providerListings: MarketplaceProviderListing[] = [];

  return {
    async createSyncJob(input) {
      const account = accounts.find(
        (item) =>
          item.provider === input.provider &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!account) throw new MarketplaceAccountMissingError(input.provider);
      const job = toTestMarketplaceJob(input, account.id, jobs.length + 1);
      jobs = [job, ...jobs].slice(0, 50);
      return job;
    },
    async findAccount(input) {
      return (
        accounts.find(
          (item) =>
            item.provider === input.provider &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async findCatalogMapping(input) {
      const catalog = input.catalog;
      return (
        catalogMappings.find(
          (item) =>
            item.provider === input.provider &&
            item.vehicleType === catalog.vehicleType &&
            item.fipeBrandCode === catalog.brandCode &&
            item.fipeModelCode === catalog.modelCode &&
            item.fipeCode === catalog.fipeCode &&
            item.fipeYearCode === catalog.yearCode,
        ) ?? null
      );
    },
    async findListingProjection(input) {
      return toTestMarketplaceListing(input.listingId);
    },
    async findProviderListing(input) {
      return (
        providerListings.find(
          (item) =>
            item.accountId === input.accountId &&
            item.listingId === input.listingId &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async findSyncJob(input) {
      return findScopedMarketplaceJob(jobs, accounts, input) ?? null;
    },
    async listOverview(input) {
      const scopedAccounts = accounts.filter(
        (item) =>
          item.storeId === input.storeId && item.tenantId === input.tenantId,
      );
      return {
        accounts: scopedAccounts,
        jobs: jobs.filter((job) =>
          scopedAccounts.some((account) => account.id === job.accountId),
        ),
        providerStates: testMarketplaceProviders.map((provider) => ({
          accountId:
            scopedAccounts.find((account) => account.provider === provider)
              ?.id ?? null,
          connectionStatus: scopedAccounts.some(
            (account) =>
              account.provider === provider && account.status === "active",
          )
            ? "connected"
            : "not_configured",
          lastSyncSummary: null,
          provider,
          requirements: [],
        })),
        providers: testMarketplaceProviders,
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
    },
    async listListingProjections(input) {
      const ids = input.listingIds?.length
        ? input.listingIds
        : ["listing_memory_1"];
      return ids.map((listingId) => toTestMarketplaceListing(listingId));
    },
    async markJobCompleted(input) {
      jobs = jobs.map((job) =>
        job.id === input.jobId
          ? {
              ...job,
              completedAt: input.completedAt,
              metadata: input.metadata ?? job.metadata,
              status: "succeeded",
            }
          : job,
      );
      const job = findMarketplaceJob(jobs, input.jobId);
      if (input.externalId && input.listingId) {
        providerListings = upsertTestProviderListing(providerListings, {
          accountId: job.accountId,
          externalId: input.externalId,
          listingId: input.listingId,
          metadata: input.metadata ?? {},
          storeId: input.storeId,
          tenantId: input.tenantId,
        });
      }
      return job;
    },
    async markJobFailed(input) {
      assertScopedMarketplaceJob(jobs, accounts, input);
      jobs = jobs.map((job) =>
        job.id === input.jobId
          ? {
              ...job,
              completedAt: input.completedAt,
              errorMessage: input.errorMessage,
              metadata: input.metadata ?? job.metadata,
              status: "failed",
            }
          : job,
      );
      return findMarketplaceJob(jobs, input.jobId);
    },
    async markJobRunning(input) {
      assertScopedMarketplaceJob(jobs, accounts, input);
      jobs = jobs.map((job) =>
        job.id === input.jobId ? { ...job, status: "running" } : job,
      );
      return findMarketplaceJob(jobs, input.jobId);
    },
    async upsertAccount(input) {
      const now = new Date();
      const existing = accounts.find(
        (item) =>
          item.provider === input.provider &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      const account: MarketplaceAccount = {
        config: input.config,
        createdAt: existing?.createdAt ?? now,
        id: existing?.id ?? `marketplace_account_${accounts.length + 1}`,
        provider: input.provider,
        status: input.status,
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      accounts = accounts.filter((item) => item.id !== account.id);
      accounts.push(account);
      return account;
    },
  };
}
