import type { MarketplaceJob } from "./ports/marketplaceRepository.js";
import {
  findScopedInMemoryJob,
  sanitizeInMemoryMarketplaceMetadata,
  upsertInMemoryProviderListing,
} from "./testSupportMarketplaceJobSupport.js";
import type { InMemoryMarketplaceJobState as State } from "./testSupportMarketplaceJobTypes.js";

export function ownedRunningJob(
  state: State,
  input: {
    dispatchLeaseOwner: string;
    jobId: string;
    storeId: string;
    tenantId: string;
  },
) {
  const job = findScopedInMemoryJob(state.jobs(), state.accounts(), input);
  return job?.status === "running" &&
    state.reconciliation.ownsDispatch(input.jobId, input.dispatchLeaseOwner)
    ? job
    : null;
}

export function ownedSubmittedJob(
  state: State,
  input: {
    jobId: string;
    leaseOwner: string;
    storeId: string;
    tenantId: string;
  },
) {
  const job = findScopedInMemoryJob(state.jobs(), state.accounts(), input);
  return job?.status === "submitted" &&
    state.reconciliation.owns(input.jobId, input.leaseOwner)
    ? job
    : null;
}

export function applyProviderListing(
  state: State,
  job: MarketplaceJob,
  input: {
    externalId?: string | null;
    listingId?: string | null;
    metadata?: Record<string, unknown>;
    storeId: string;
    tenantId: string;
  },
) {
  if (!input.listingId) return;
  if (job.jobType === "listing_unpublish") {
    state.setProviderListings(
      state
        .providerListings()
        .filter(
          (item) =>
            item.accountId !== job.accountId ||
            item.listingId !== input.listingId,
        ),
    );
  } else if (input.externalId) {
    state.setProviderListings(
      upsertInMemoryProviderListing(state.providerListings(), {
        accountId: job.accountId,
        externalId: input.externalId,
        listingId: input.listingId,
        metadata: sanitizeInMemoryMarketplaceMetadata(input.metadata ?? {}),
        storeId: input.storeId as never,
        tenantId: input.tenantId as never,
      }),
    );
  }
}
