import type {
  MarketplaceAccount,
  MarketplaceCatalogMapping,
  MarketplaceJob,
  MarketplaceProviderListing,
  MarketplaceRepository,
  UpsertMarketplaceAccountInput,
} from "../../../../domains/marketplace/ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "../../../../domains/marketplace/ports/marketplaceRepository.js";
import {
  assertScopedMemoryJob,
  findMemoryJob,
  findScopedMemoryJob,
  toMemoryMarketplaceJob,
  toMemoryMarketplaceListing,
  toMemoryMarketplaceOverview,
  upsertMemoryProviderListing,
} from "./marketplaceRepositorySupport.js";

export function createMemoryMarketplaceRepository(): MarketplaceRepository {
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
      const job = toMemoryMarketplaceJob(input, account.id, jobs.length + 1);
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
      return toMemoryMarketplaceListing(input.listingId);
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
      return findScopedMemoryJob(jobs, accounts, input) ?? null;
    },
    async listOverview(input) {
      return toMemoryMarketplaceOverview(
        input.storeId,
        input.tenantId,
        accounts,
        jobs,
      );
    },
    async listListingProjections(input) {
      const ids = input.listingIds?.length
        ? input.listingIds
        : ["listing_memory_1"];
      return ids.map((listingId) => toMemoryMarketplaceListing(listingId));
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
      const job = findMemoryJob(jobs, input.jobId);
      if (input.externalId && input.listingId) {
        providerListings = upsertMemoryProviderListing(providerListings, {
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
      assertScopedMemoryJob(jobs, accounts, input);
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
      return findMemoryJob(jobs, input.jobId);
    },
    async markJobRunning(input) {
      assertScopedMemoryJob(jobs, accounts, input);
      jobs = jobs.map((job) =>
        job.id === input.jobId ? { ...job, status: "running" } : job,
      );
      return findMemoryJob(jobs, input.jobId);
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
      accounts = [
        ...accounts.filter(
          (item) => item.id !== account.id && item.id !== existing?.id,
        ),
        account,
      ].sort((left, right) => left.provider.localeCompare(right.provider));
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
