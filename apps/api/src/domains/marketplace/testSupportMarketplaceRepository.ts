import type {
  MarketplaceAccount,
  MarketplaceCatalogMapping,
  MarketplaceJob,
  MarketplaceProviderListing,
  MarketplaceRepository,
} from "./ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "./ports/marketplaceRepository.js";
import { readMarketplaceProviderCapabilities } from "./readModels/marketplaceProviderCapabilities.js";
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
  let accountSequence = 0;
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
        providerStates: testMarketplaceProviders.map((provider) => {
          const account = scopedAccounts.find(
            (item) => item.provider === provider,
          );
          return {
            accountId: account?.id ?? null,
            capabilities: readMarketplaceProviderCapabilities(
              provider,
              account,
            ),
            connectionStatus: scopedAccounts.some(
              (account) =>
                account.provider === provider && account.status === "active",
            )
              ? "connected"
              : "not_configured",
            lastSyncSummary: null,
            provider,
            requirements: [],
          };
        }),
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
      const sameIdentity =
        input.providerAccountId === undefined ||
        (existing !== undefined &&
          readProviderAccountId(existing.config) === input.providerAccountId);
      const account: MarketplaceAccount = {
        config: input.config,
        createdAt: existing && sameIdentity ? existing.createdAt : now,
        id:
          existing && sameIdentity
            ? existing.id
            : `marketplace_account_${++accountSequence}`,
        provider: input.provider,
        status: input.status,
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      accounts = accounts.filter(
        (item) => item.id !== account.id && item.id !== existing?.id,
      );
      accounts.push(account);
      return account;
    },
  };
}

function readProviderAccountId(config: Record<string, unknown>) {
  const connection = toRecord(config.connection);
  return typeof connection.providerAccountId === "string"
    ? connection.providerAccountId
    : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
