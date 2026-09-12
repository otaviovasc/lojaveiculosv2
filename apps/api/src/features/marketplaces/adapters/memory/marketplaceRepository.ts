import type {
  MarketplaceAccount,
  MarketplaceCatalogMapping,
  MarketplaceJob,
  MarketplaceProviderListing,
  MarketplaceRepository,
  UpsertMarketplaceAccountInput,
} from "../../../../domains/marketplace/ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "../../../../domains/marketplace/ports/marketplaceRepository.js";
import { marketplaceJobIdempotencyKey } from "../../../../domains/marketplace/services/MarketplaceService/marketplaceJobIdempotency.js";
import { createInMemoryMarketplaceJobRepository } from "../../../../domains/marketplace/testSupportMarketplaceJobRepository.js";
import {
  findScopedMemoryJob,
  MemoryMarketplaceReconciliation,
  toMemoryMarketplaceJob,
  toMemoryMarketplaceListing,
  toMemoryMarketplaceOverview,
} from "./marketplaceRepositorySupport.js";

export function createMemoryMarketplaceRepository(): MarketplaceRepository {
  let accountSequence = 0;
  const archivedAccountIds = new Set<string>();
  let accounts: MarketplaceAccount[] = [];
  let catalogMappings: MarketplaceCatalogMapping[] = [];
  let jobs: MarketplaceJob[] = [];
  let providerListings: MarketplaceProviderListing[] = [];
  const reconciliation = new MemoryMarketplaceReconciliation();

  return {
    async createSyncJob(input) {
      const account = accounts.find(
        (item) =>
          !archivedAccountIds.has(item.id) &&
          item.provider === input.provider &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
      );
      if (!account) throw new MarketplaceAccountMissingError(input.provider);
      const idempotencyKey = marketplaceJobIdempotencyKey(input);
      const existing = idempotencyKey
        ? jobs.find(
            (job) =>
              job.accountId === account.id &&
              marketplaceJobIdempotencyKey({
                jobType: job.jobType,
                metadata: job.metadata,
                provider: job.provider,
              }) === idempotencyKey,
          )
        : null;
      if (existing) return existing;
      const job = toMemoryMarketplaceJob(input, account.id, jobs.length + 1);
      jobs = [job, ...jobs].slice(0, 50);
      return job;
    },
    async findAccount(input) {
      return (
        accounts.find(
          (item) =>
            !archivedAccountIds.has(item.id) &&
            item.provider === input.provider &&
            item.storeId === input.storeId &&
            item.tenantId === input.tenantId,
        ) ?? null
      );
    },
    async findAccountById(input) {
      return (
        accounts.find(
          (item) =>
            item.id === input.accountId &&
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
        accounts.filter((account) => !archivedAccountIds.has(account.id)),
        jobs,
      );
    },
    async listListingProjections(input) {
      const ids = input.listingIds?.length
        ? input.listingIds
        : ["listing_memory_1"];
      return ids.map((listingId) => toMemoryMarketplaceListing(listingId));
    },
    async listActiveSyncJobs(input) {
      return jobs.filter((job) => {
        const account = accounts.find((item) => item.id === job.accountId);
        const listingId = readString(job.metadata.listingId);
        return (
          account?.provider === input.provider &&
          account.storeId === input.storeId &&
          account.tenantId === input.tenantId &&
          ["queued", "running", "submitted"].includes(job.status) &&
          (!input.listingIds?.length ||
            (listingId !== null && input.listingIds.includes(listingId)))
        );
      });
    },
    async listProviderListings(input) {
      return providerListings.filter(
        (item) =>
          item.accountId === input.accountId &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId &&
          (!input.listingIds?.length ||
            input.listingIds.includes(item.listingId)),
      );
    },
    ...createInMemoryMarketplaceJobRepository({
      accounts: () => accounts,
      jobs: () => jobs,
      providerListings: () => providerListings,
      reconciliation,
      setJobs: (next) => {
        jobs = next;
      },
      setProviderListings: (next) => {
        providerListings = next;
      },
    }),
    async upsertAccount(input) {
      const now = new Date();
      const existing = accounts.find(
        (item) =>
          !archivedAccountIds.has(item.id) &&
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
      if (existing && !sameIdentity) archivedAccountIds.add(existing.id);
      accounts = [
        ...accounts.filter((item) => item.id !== account.id),
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

function readString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
