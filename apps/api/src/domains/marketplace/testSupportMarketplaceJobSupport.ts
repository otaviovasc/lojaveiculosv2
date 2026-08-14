import type {
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceProviderListing,
} from "./ports/marketplaceRepository.js";

export function findScopedInMemoryJob(
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

export function findInMemoryJob(
  jobs: readonly MarketplaceJob[],
  jobId: string,
) {
  const job = jobs.find((item) => item.id === jobId);
  if (!job) throw new Error(`Marketplace job not found: ${jobId}`);
  return job;
}

export function assertScopedInMemoryJob(
  jobs: MarketplaceJob[],
  accounts: MarketplaceAccount[],
  input: { jobId: string; storeId: string; tenantId: string },
) {
  if (!findScopedInMemoryJob(jobs, accounts, input)) {
    throw new Error(`Marketplace job not found: ${input.jobId}`);
  }
}

export function upsertInMemoryProviderListing(
  items: readonly MarketplaceProviderListing[],
  item: MarketplaceProviderListing,
) {
  return [
    ...items.filter(
      (current) =>
        current.accountId !== item.accountId ||
        current.listingId !== item.listingId,
    ),
    item,
  ];
}

export function sanitizeInMemoryMarketplaceMetadata(
  metadata: Record<string, unknown>,
) {
  const sensitive = new Set([
    "accessToken",
    "operationToken",
    "providerOperationToken",
    "refreshToken",
  ]);
  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !sensitive.has(key)),
  );
}

export function assertAcceptedInMemoryExternalId(
  job: MarketplaceJob,
  externalId: string | null,
) {
  if (
    ["listing_publish", "listing_update"].includes(job.jobType) &&
    !externalId
  ) {
    throw new Error(
      "Marketplace provider listing acceptance requires an external id.",
    );
  }
}
