import type { MarketplaceRepository } from "./ports/marketplaceRepository.js";
import {
  assertAcceptedInMemoryExternalId,
  assertScopedInMemoryJob,
  findInMemoryJob,
  sanitizeInMemoryMarketplaceMetadata,
} from "./testSupportMarketplaceJobSupport.js";
import type { InMemoryMarketplaceJobState as State } from "./testSupportMarketplaceJobTypes.js";
import {
  applyProviderListing,
  ownedRunningJob,
  ownedSubmittedJob,
} from "./testSupportMarketplaceJobTransitions.js";

type JobMethods = Pick<
  MarketplaceRepository,
  | "claimSubmittedJobs"
  | "completeSubmittedJob"
  | "failSubmittedJob"
  | "listProcessableJobScopes"
  | "listQueuedJobIds"
  | "markJobCompleted"
  | "markJobFailed"
  | "markJobRunning"
  | "markJobSubmitted"
  | "recoverStaleRunningJobs"
  | "rescheduleSubmittedJob"
>;

export function createInMemoryMarketplaceJobRepository(
  state: State,
): JobMethods {
  return {
    async listProcessableJobScopes(input) {
      return state.reconciliation.listScopes(
        state.jobs(),
        state.accounts(),
        input,
      );
    },
    async listQueuedJobIds(input) {
      return state
        .jobs()
        .filter((job) => {
          const account = state
            .accounts()
            .find((item) => item.id === job.accountId);
          return (
            job.status === "queued" &&
            account?.storeId === input.scope.storeId &&
            account.tenantId === input.scope.tenantId
          );
        })
        .slice(0, input.limit)
        .map(({ id }) => id);
    },
    async claimSubmittedJobs(input) {
      return state.reconciliation.claim(state.jobs(), state.accounts(), input);
    },
    async markJobCompleted(input) {
      assertScopedInMemoryJob(state.jobs(), state.accounts(), input);
      const current = ownedRunningJob(state, input);
      if (!current) return null;
      assertAcceptedInMemoryExternalId(current, input.externalId ?? null);
      state.setJobs(
        state.jobs().map((job) =>
          job.id === input.jobId
            ? {
                ...job,
                completedAt: input.completedAt,
                metadata: sanitizeInMemoryMarketplaceMetadata(
                  input.metadata ?? job.metadata,
                ),
                status: "succeeded",
              }
            : job,
        ),
      );
      const job = findInMemoryJob(state.jobs(), input.jobId);
      state.reconciliation.clear(job.id);
      applyProviderListing(state, job, input);
      return job;
    },
    async markJobFailed(input) {
      assertScopedInMemoryJob(state.jobs(), state.accounts(), input);
      if (!ownedRunningJob(state, input)) return null;
      state.setJobs(
        state.jobs().map((job) =>
          job.id === input.jobId
            ? {
                ...job,
                completedAt: input.completedAt,
                errorMessage: input.errorMessage,
                metadata: sanitizeInMemoryMarketplaceMetadata(
                  input.metadata ?? job.metadata,
                ),
                status: "failed",
              }
            : job,
        ),
      );
      state.reconciliation.clear(input.jobId);
      return findInMemoryJob(state.jobs(), input.jobId);
    },
    async markJobRunning(input) {
      assertScopedInMemoryJob(state.jobs(), state.accounts(), input);
      const current = findInMemoryJob(state.jobs(), input.jobId);
      if (current.status !== "queued") return null;
      state.setJobs(
        state
          .jobs()
          .map((job) =>
            job.id === input.jobId ? { ...job, status: "running" } : job,
          ),
      );
      state.reconciliation.dispatch(
        input.jobId,
        input.dispatchLeaseOwner,
        input.dispatchLeaseExpiresAt,
      );
      return findInMemoryJob(state.jobs(), input.jobId);
    },
    async markJobSubmitted(input) {
      assertScopedInMemoryJob(state.jobs(), state.accounts(), input);
      if (!ownedRunningJob(state, input)) return null;
      state.setJobs(
        state.jobs().map((job) =>
          job.id === input.jobId
            ? {
                ...job,
                metadata: sanitizeInMemoryMarketplaceMetadata(input.metadata),
                status: "submitted",
              }
            : job,
        ),
      );
      const job = findInMemoryJob(state.jobs(), input.jobId);
      state.reconciliation.submit(job.id, input);
      return job;
    },
    async recoverStaleRunningJobs(input) {
      const ids = state.reconciliation.recoverStale(
        state.jobs(),
        state.accounts(),
        input,
      );
      state.setJobs(
        state.jobs().map((job) =>
          ids.includes(job.id)
            ? {
                ...job,
                metadata: {
                  ...job.metadata,
                  reconciliationRequired: true,
                  recoveryReason: "dispatch_lease_expired",
                },
                status: "submitted",
              }
            : job,
        ),
      );
      return state.jobs().filter((job) => ids.includes(job.id));
    },
    async rescheduleSubmittedJob(input) {
      const job = ownedSubmittedJob(state, input);
      if (!job) return null;
      state.setJobs(
        state.jobs().map((item) =>
          item.id === job.id
            ? {
                ...item,
                metadata: sanitizeInMemoryMarketplaceMetadata(input.metadata),
              }
            : item,
        ),
      );
      state.reconciliation.reschedule(job.id, input);
      return findInMemoryJob(state.jobs(), job.id);
    },
    async completeSubmittedJob(input) {
      const job = ownedSubmittedJob(state, input);
      if (!job) return null;
      assertAcceptedInMemoryExternalId(job, input.externalId);
      state.setJobs(
        state.jobs().map((item) =>
          item.id === job.id
            ? {
                ...item,
                completedAt: input.completedAt,
                metadata: sanitizeInMemoryMarketplaceMetadata(input.metadata),
                status: "succeeded",
              }
            : item,
        ),
      );
      applyProviderListing(state, job, input);
      state.reconciliation.clear(job.id);
      return findInMemoryJob(state.jobs(), job.id);
    },
    async failSubmittedJob(input) {
      const job = ownedSubmittedJob(state, input);
      if (!job) return null;
      state.setJobs(
        state.jobs().map((item) =>
          item.id === job.id
            ? {
                ...item,
                completedAt: input.completedAt,
                errorMessage: input.errorMessage,
                metadata: sanitizeInMemoryMarketplaceMetadata(input.metadata),
                status: "failed",
              }
            : item,
        ),
      );
      state.reconciliation.clear(job.id);
      return findInMemoryJob(state.jobs(), job.id);
    },
  };
}
