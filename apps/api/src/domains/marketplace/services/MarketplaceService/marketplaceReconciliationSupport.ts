import type {
  MarketplaceJob,
  MarketplaceJobScope,
  MarketplaceReconciliationClaim,
} from "../../ports/marketplaceRepository.js";
import type {
  MarketplaceListingReconciliationResult,
  MarketplaceProviderGateway,
} from "../../ports/marketplaceProviderGateway.js";
import { createOlxProviderListingId } from "../../payloads/marketplaceListingPayload.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  marketplaceJobNotFound,
  MarketplaceServiceError,
} from "./marketplaceErrors.js";
import type { MarketplaceServicePorts } from "./serviceSupport.js";

const BASE_DELAY_MS = 60_000;
const MAX_DELAY_MS = 30 * 60_000;

export function reconciliationDelay(
  claim: MarketplaceReconciliationClaim,
  error?: unknown,
) {
  const retryAfter = readPositiveNumber(error, "retryAfterSeconds");
  if (retryAfter) return Math.min(retryAfter * 1_000, MAX_DELAY_MS);
  const exponential = Math.min(
    BASE_DELAY_MS * 2 ** Math.min(claim.attemptCount, 5),
    MAX_DELAY_MS,
  );
  const stableJitter =
    hashPercent(claim.job.id) * Math.round(exponential * 0.2);
  return exponential + stableJitter;
}

export function reconciliationExternalId(job: MarketplaceJob) {
  const explicit = readString(job.metadata.externalId);
  if (explicit) return explicit;
  const providerResult = readRecord(job.metadata.providerResult);
  const resultExternalId = readString(providerResult.externalId);
  if (resultExternalId) return resultExternalId;
  const listingId = reconciliationListingId(job);
  return job.provider === "olx" && listingId
    ? createOlxProviderListingId(listingId)
    : null;
}

export function reconciliationListId(job: MarketplaceJob) {
  const providerResult = readRecord(job.metadata.providerResult);
  return (
    readString(providerResult.providerListingId) ??
    readString(providerResult.listId) ??
    readString(job.metadata.providerListingId)
  );
}

export function reconciliationListingId(job: MarketplaceJob) {
  return readString(job.metadata.listingId);
}

export function safeReconciliationMetadata(
  job: MarketplaceJob,
  result: MarketplaceListingReconciliationResult,
  checkedAt: Date,
  extra: Record<string, unknown> = {},
) {
  return {
    ...job.metadata,
    providerResult: {
      externalId: result.externalId,
      ...(result.listId ? { providerListingId: result.listId } : {}),
      ...(result.listingUrl ? { listingUrl: result.listingUrl } : {}),
      ...(result.message ? { message: result.message } : {}),
      providerStatus: result.providerStatus,
    },
    reconciliationLastCheckedAt: checkedAt.toISOString(),
    ...extra,
  };
}

export function transientReconciliationMetadata(
  job: MarketplaceJob,
  checkedAt: Date,
  error: unknown,
  extra: Record<string, unknown> = {},
) {
  return {
    ...job.metadata,
    providerResult: {
      ...readRecord(job.metadata.providerResult),
      ...(readString(readRecord(error).code)
        ? { providerStatus: readString(readRecord(error).code) }
        : {}),
    },
    reconciliationLastCheckedAt: checkedAt.toISOString(),
    reconciliationRequired: true,
    ...extra,
  };
}

export function requireReconciliationGateway(
  gateway: MarketplaceProviderGateway | undefined,
) {
  return gateway?.reconcileListingSync ?? null;
}

export function isOperationExpired(
  claim: MarketplaceReconciliationClaim,
  now: Date,
) {
  return Boolean(
    claim.operationExpiresAt &&
    claim.operationExpiresAt.getTime() <= now.getTime(),
  );
}

export function isTerminalSuccess(
  job: MarketplaceJob,
  result: MarketplaceListingReconciliationResult,
) {
  return job.jobType === "listing_unpublish"
    ? result.state === "deleted"
    : result.state === "accepted";
}

export function isTerminalFailure(
  result: MarketplaceListingReconciliationResult,
) {
  return result.state === "error" || result.state === "refused";
}

export function terminalErrorMessage(
  result: MarketplaceListingReconciliationResult,
) {
  if (result.message) return result.message;
  return result.state === "refused"
    ? "OLX recusou o anúncio. Revise os dados do veículo antes de tentar novamente."
    : "OLX não conseguiu processar o anúncio. Revise os dados antes de tentar novamente.";
}

export async function auditReconciliationOutcome(
  context: ServiceContext,
  job: MarketplaceJob | null,
  providerStatus: string,
) {
  if (!job) return;
  await context.audit.record({
    action: "marketplace.sync_job.reconciled",
    actor: context.actor,
    category: "integration",
    entityId: job.id,
    entityType: "marketplace_job",
    metadata: { jobType: job.jobType, provider: job.provider, providerStatus },
    outcome: job.status === "succeeded" ? "succeeded" : "failed",
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Reconciled marketplace publication status",
  });
}

export async function queuedMarketplaceJobId(
  ports: MarketplaceServicePorts,
  scope: MarketplaceJobScope,
  jobId: string,
) {
  const job = await ports.marketplaceRepository.findSyncJob({
    jobId,
    ...scope,
  });
  if (!job) throw marketplaceJobNotFound(jobId);
  return job.status === "queued" ? [job.id] : [];
}

export function marketplaceRecoveryScope(
  context: ServiceContext,
): MarketplaceJobScope {
  if (!context.storeId || !context.tenantId)
    throw marketplaceJobNotFound("scope");
  return {
    storeId: context.storeId as never,
    tenantId: context.tenantId as never,
  };
}

export function boundedMarketplaceJobLimit(
  value: number | undefined,
  fallback: number,
) {
  return Math.min(Math.max(Math.trunc(value ?? fallback), 1), 100);
}

export function countMarketplaceJob(
  result: {
    failed: number;
    processed: number;
    queued: number;
    submitted: number;
    succeeded: number;
  },
  job: MarketplaceJob,
) {
  result.processed += 1;
  const key =
    job.status === "succeeded"
      ? "succeeded"
      : job.status === "failed"
        ? "failed"
        : job.status === "submitted"
          ? "submitted"
          : "queued";
  result[key] += 1;
}

export function isStaleMarketplaceClaim(error: unknown) {
  return (
    error instanceof MarketplaceServiceError &&
    error.code === "MARKETPLACE_SYNC_JOB_STALE"
  );
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveNumber(value: unknown, key: string) {
  const number = readRecord(value)[key];
  return typeof number === "number" && Number.isFinite(number) && number > 0
    ? number
    : null;
}

function hashPercent(value: string) {
  let hash = 0;
  for (const character of value)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return (hash % 101) / 100;
}
