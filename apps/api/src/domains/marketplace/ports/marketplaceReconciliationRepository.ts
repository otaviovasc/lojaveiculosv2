import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type {
  MarketplaceJob,
  MarketplaceProvider,
} from "./marketplaceRepository.js";

export type MarketplaceJobScope = { storeId: StoreId; tenantId: TenantId };

export type MarketplaceReconciliationClaim = {
  attemptCount: number;
  job: MarketplaceJob;
  leaseOwner: string;
  operationExpiresAt: Date | null;
  operationToken: string | null;
};

export type MarketplaceReconciliationRepository = {
  listProcessableJobScopes: (input: {
    limit: number;
    now: Date;
  }) => Promise<MarketplaceJobScope[]>;
  listQueuedJobIds: (input: {
    limit: number;
    scope: MarketplaceJobScope;
  }) => Promise<string[]>;
  claimSubmittedJobs: (
    input: MarketplaceJobScope & {
      force?: boolean;
      jobId?: string;
      leaseExpiresAt: Date;
      leaseOwner: string;
      limit: number;
      now: Date;
    },
  ) => Promise<MarketplaceReconciliationClaim[]>;
  rescheduleSubmittedJob: (
    input: MarketplaceJobScope & {
      checkedAt: Date;
      jobId: string;
      leaseOwner: string;
      metadata: Record<string, unknown>;
      nextAttemptAt: Date | null;
    },
  ) => Promise<MarketplaceJob | null>;
  completeSubmittedJob: (
    input: MarketplaceJobScope & {
      completedAt: Date;
      externalId: string | null;
      jobId: string;
      leaseOwner: string;
      listingId: string;
      metadata: Record<string, unknown>;
      provider: MarketplaceProvider;
    },
  ) => Promise<MarketplaceJob | null>;
  failSubmittedJob: (
    input: MarketplaceJobScope & {
      completedAt: Date;
      errorMessage: string;
      jobId: string;
      leaseOwner: string;
      metadata: Record<string, unknown>;
    },
  ) => Promise<MarketplaceJob | null>;
};
