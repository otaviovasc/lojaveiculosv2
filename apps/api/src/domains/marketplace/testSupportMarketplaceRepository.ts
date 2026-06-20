import type {
  CreateMarketplaceJobInput,
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceListingProjection,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceRepository,
} from "./ports/marketplaceRepository.js";
import { MarketplaceAccountMissingError } from "./ports/marketplaceRepository.js";

const providers = ["olx", "mercado_livre"] satisfies MarketplaceProvider[];

export function createTestMarketplaceRepository(): MarketplaceRepository {
  let accounts: MarketplaceAccount[] = [];
  let jobs: MarketplaceJob[] = [];

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
    async findSyncJob(input) {
      return findScopedJob(jobs, accounts, input) ?? null;
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
        providers,
        storeId: input.storeId,
        tenantId: input.tenantId,
      };
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
      return findJob(jobs, input.jobId);
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
      accounts = accounts.filter((item) => item.id !== account.id);
      accounts.push(account);
      return account;
    },
  };
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
    listingId,
    mediaUrls: [],
    modelYear: 2024,
    priceCents: 10000000,
    title: "Veiculo de teste",
    vehicleType: "cars",
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
