import type {
  MarketplaceAccount,
  MarketplaceCatalogMapping,
  MarketplaceJob,
  MarketplaceProviderListing,
  MarketplaceRepository,
} from "./ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "./ports/marketplaceRepository.js";
import { readMarketplaceProviderCapabilities } from "./readModels/marketplaceProviderCapabilities.js";
import { TestMarketplaceReconciliation } from "./testSupportMarketplaceReconciliation.js";
import { marketplaceJobIdempotencyKey } from "./services/MarketplaceService/marketplaceJobIdempotency.js";
import { createInMemoryMarketplaceJobRepository } from "./testSupportMarketplaceJobRepository.js";
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
  const archivedAccountIds = new Set<string>();
  let accounts: MarketplaceAccount[] = [];
  let catalogMappings: MarketplaceCatalogMapping[] = [];
  let jobs: MarketplaceJob[] = [];
  let providerListings: MarketplaceProviderListing[] = [];
  const reconciliation = new TestMarketplaceReconciliation();

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
      const job = toTestMarketplaceJob(input, account.id, jobs.length + 1);
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
          !archivedAccountIds.has(item.id) &&
          item.storeId === input.storeId &&
          item.tenantId === input.tenantId,
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
      accounts = accounts.filter((item) => item.id !== account.id);
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

function readString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}
