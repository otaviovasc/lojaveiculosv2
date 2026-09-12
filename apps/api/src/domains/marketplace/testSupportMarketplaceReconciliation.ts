import type {
  MarketplaceAccount,
  MarketplaceJob,
  MarketplaceJobScope,
  MarketplaceReconciliationClaim,
} from "./ports/marketplaceRepository.js";

export class TestMarketplaceReconciliation {
  readonly #dispatches = new Map<string, { expiresAt: Date; owner: string }>();
  readonly #states = new Map<string, ReconciliationState>();

  clear(jobId: string) {
    this.#dispatches.delete(jobId);
    this.#states.delete(jobId);
  }

  dispatch(jobId: string, owner: string, expiresAt: Date) {
    this.#dispatches.set(jobId, { expiresAt, owner });
  }

  ownsDispatch(jobId: string, owner: string) {
    return this.#dispatches.get(jobId)?.owner === owner;
  }

  recoverStale(
    jobs: readonly MarketplaceJob[],
    accounts: readonly MarketplaceAccount[],
    input: {
      limit: number;
      now: Date;
      scope: MarketplaceJobScope;
    },
  ) {
    const ids = jobs
      .filter((job) => {
        const account = accounts.find((item) => item.id === job.accountId);
        const dispatch = this.#dispatches.get(job.id);
        return (
          job.status === "running" &&
          account?.storeId === input.scope.storeId &&
          account.tenantId === input.scope.tenantId &&
          dispatch !== undefined &&
          dispatch.expiresAt.getTime() <= input.now.getTime()
        );
      })
      .slice(0, input.limit)
      .map(({ id }) => id);
    ids.forEach((id) => this.clear(id));
    return ids;
  }

  submit(
    jobId: string,
    input: Pick<
      ReconciliationState,
      "nextAttemptAt" | "operationExpiresAt" | "operationToken"
    >,
  ) {
    this.#dispatches.delete(jobId);
    this.#states.set(jobId, { ...emptyState(), ...input });
  }

  owns(jobId: string, leaseOwner: string) {
    return this.#states.get(jobId)?.leaseOwner === leaseOwner;
  }

  reschedule(
    jobId: string,
    input: { checkedAt: Date; nextAttemptAt: Date | null },
  ) {
    const state = this.#states.get(jobId);
    if (!state) return;
    this.#states.set(jobId, {
      ...state,
      lastCheckedAt: input.checkedAt,
      leaseExpiresAt: null,
      leaseOwner: null,
      nextAttemptAt: input.nextAttemptAt,
    });
  }

  listScopes(
    jobs: readonly MarketplaceJob[],
    accounts: readonly MarketplaceAccount[],
    input: { limit: number; now: Date },
  ): MarketplaceJobScope[] {
    const scopes = new Map<string, MarketplaceJobScope>();
    for (const job of jobs) {
      const account = accounts.find((item) => item.id === job.accountId);
      if (!account || !this.#isProcessable(job, input.now)) continue;
      scopes.set(`${account.tenantId}:${account.storeId}`, {
        storeId: account.storeId,
        tenantId: account.tenantId,
      });
    }
    return [...scopes.values()].slice(0, input.limit);
  }

  claim(
    jobs: readonly MarketplaceJob[],
    accounts: readonly MarketplaceAccount[],
    input: ClaimInput,
  ): MarketplaceReconciliationClaim[] {
    const claims: MarketplaceReconciliationClaim[] = [];
    for (const job of jobs) {
      if (claims.length >= input.limit) break;
      const account = accounts.find((item) => item.id === job.accountId);
      const state = this.#states.get(job.id);
      const forced = Boolean(input.force && input.jobId === job.id);
      if (
        job.status !== "submitted" ||
        account?.storeId !== input.storeId ||
        account.tenantId !== input.tenantId ||
        (input.jobId !== undefined && job.id !== input.jobId) ||
        !(forced || isDue(state, input.now)) ||
        !leaseAvailable(state, input.now)
      )
        continue;
      const claimed = {
        ...(state ?? emptyState()),
        attemptCount: (state?.attemptCount ?? 0) + 1,
        leaseExpiresAt: input.leaseExpiresAt,
        leaseOwner: input.leaseOwner,
      };
      this.#states.set(job.id, claimed);
      claims.push({
        attemptCount: claimed.attemptCount,
        job,
        leaseOwner: input.leaseOwner,
        operationExpiresAt: claimed.operationExpiresAt,
        operationToken: claimed.operationToken,
      });
    }
    return claims;
  }

  #isProcessable(job: MarketplaceJob, now: Date) {
    const state = this.#states.get(job.id);
    const dispatch = this.#dispatches.get(job.id);
    return (
      job.status === "queued" ||
      (job.status === "running" &&
        dispatch !== undefined &&
        dispatch.expiresAt.getTime() <= now.getTime()) ||
      (job.status === "submitted" &&
        isDue(state, now) &&
        leaseAvailable(state, now))
    );
  }
}

type ReconciliationState = {
  attemptCount: number;
  lastCheckedAt: Date | null;
  leaseExpiresAt: Date | null;
  leaseOwner: string | null;
  nextAttemptAt: Date | null;
  operationExpiresAt: Date | null;
  operationToken: string | null;
};
type ClaimInput = {
  force?: boolean;
  jobId?: string;
  leaseExpiresAt: Date;
  leaseOwner: string;
  limit: number;
  now: Date;
  storeId: string;
  tenantId: string;
};

function emptyState(): ReconciliationState {
  return {
    attemptCount: 0,
    lastCheckedAt: null,
    leaseExpiresAt: null,
    leaseOwner: null,
    nextAttemptAt: null,
    operationExpiresAt: null,
    operationToken: null,
  };
}

function isDue(state: ReconciliationState | undefined, now: Date) {
  return Boolean(
    state?.nextAttemptAt && state.nextAttemptAt.getTime() <= now.getTime(),
  );
}

function leaseAvailable(state: ReconciliationState | undefined, now: Date) {
  return (
    !state?.leaseOwner ||
    (state.leaseExpiresAt?.getTime() ?? 0) <= now.getTime()
  );
}
