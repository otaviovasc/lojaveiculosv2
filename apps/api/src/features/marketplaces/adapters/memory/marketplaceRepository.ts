import type {
  CreateMarketplaceJobInput,
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceListingProjection,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceProviderListing,
  MarketplaceRepository,
  UpsertMarketplaceAccountInput,
} from "../../../../domains/marketplace/ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "../../../../domains/marketplace/ports/marketplaceRepository.js";

const providers = ["olx", "mercado_livre"] satisfies MarketplaceProvider[];

export function createMemoryMarketplaceRepository(): MarketplaceRepository {
  let accounts: MarketplaceAccount[] = [];
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
      const job = toJob(input, account.id, jobs.length + 1);
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
    async findListingProjection(input) {
      return toMemoryListing(input.listingId);
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
      return findScopedJob(jobs, accounts, input) ?? null;
    },
    async listOverview(input) {
      return toOverview(input.storeId, input.tenantId, accounts, jobs);
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
      const job = findJob(jobs, input.jobId);
      if (input.externalId && input.listingId) {
        providerListings = upsertProviderListing(providerListings, {
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
      assertScopedJob(jobs, accounts, input);
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
      return findJob(jobs, input.jobId);
    },
    async markJobRunning(input) {
      assertScopedJob(jobs, accounts, input);
      jobs = jobs.map((job) =>
        job.id === input.jobId ? { ...job, status: "running" } : job,
      );
      return findJob(jobs, input.jobId);
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
      accounts = [
        ...accounts.filter((item) => item.id !== account.id),
        account,
      ].sort((left, right) => left.provider.localeCompare(right.provider));
      return account;
    },
  };
}

function upsertProviderListing(
  providerListings: readonly MarketplaceProviderListing[],
  providerListing: MarketplaceProviderListing,
): MarketplaceProviderListing[] {
  return [
    ...providerListings.filter(
      (item) =>
        item.accountId !== providerListing.accountId ||
        item.listingId !== providerListing.listingId,
    ),
    providerListing,
  ];
}

function assertScopedJob(
  jobs: MarketplaceJob[],
  accounts: MarketplaceAccount[],
  input: { jobId: string; storeId: string; tenantId: string },
) {
  if (findScopedJob(jobs, accounts, input)) return;
  throw new Error(`Marketplace job not found: ${input.jobId}`);
}

function findScopedJob(
  jobs: MarketplaceJob[],
  accounts: MarketplaceAccount[],
  input: { jobId: string; storeId: string; tenantId: string },
) {
  const job = jobs.find((item) => item.id === input.jobId);
  const account = job
    ? accounts.find((item) => item.id === job.accountId)
    : null;
  return account?.storeId === input.storeId &&
    account.tenantId === input.tenantId
    ? job
    : null;
}

function findJob(jobs: readonly MarketplaceJob[], jobId: string) {
  const job = jobs.find((item) => item.id === jobId);
  if (!job) throw new Error(`Marketplace job not found: ${jobId}`);
  return job;
}

function toMemoryListing(listingId: string): MarketplaceListingProjection {
  return {
    description: "Anuncio de teste para integracao.",
    isVisibleOnPublicSite: true,
    listingId,
    mediaUrls: ["https://cdn.local/vehicle-front.jpg"],
    modelYear: 2024,
    priceCents: 10000000,
    status: "published",
    title: "Veiculo de teste",
    vehicleType: "cars",
  };
}

function toOverview(
  storeId: MarketplaceOverview["storeId"],
  tenantId: MarketplaceOverview["tenantId"],
  accounts: readonly MarketplaceAccount[],
  jobs: readonly MarketplaceJob[],
): MarketplaceOverview {
  const scopedAccounts = accounts.filter(
    (item) => item.storeId === storeId && item.tenantId === tenantId,
  );
  return {
    accounts: scopedAccounts,
    jobs: jobs.filter((item) =>
      scopedAccounts.some((account) => account.id === item.accountId),
    ),
    providers,
    storeId,
    tenantId,
  };
}

function toJob(
  input: CreateMarketplaceJobInput,
  accountId: string,
  sequence: number,
): MarketplaceJob {
  return {
    accountId,
    completedAt: null,
    createdAt: new Date(),
    errorMessage: null,
    id: `marketplace_job_${sequence}`,
    jobType: input.jobType,
    metadata: input.metadata,
    provider: input.provider,
    status: "queued",
  };
}
