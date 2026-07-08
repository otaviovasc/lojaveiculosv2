import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceJob,
  MarketplaceListingProjection,
} from "../../ports/marketplaceRepository.js";
import {
  MarketplaceProviderRuntimeError,
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { MarketplaceServiceError } from "./marketplaceErrors.js";
import { permissionForMarketplaceJob } from "./marketplaceJobPermissions.js";
import { readMarketplaceAccountToken } from "./marketplaceAccountPreflight.js";
import { listListingBlockers } from "./marketplaceStockPlanRules.js";
import { recordRunAudit } from "./runMarketplaceSyncJobAudit.js";

export type RunMarketplaceSyncJobInput = {
  jobId: string;
};

export async function runMarketplaceSyncJob(
  context: ServiceContext,
  input: RunMarketplaceSyncJobInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceJob> {
  const scope = requireMarketplaceScope(context);
  const queuedJob = await ports.marketplaceRepository.findSyncJob({
    jobId: input.jobId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!queuedJob) throw new MarketplaceProviderRuntimeError("Job missing.");
  if (queuedJob.status !== "queued") {
    throw new MarketplaceServiceError({
      code: "MARKETPLACE_SYNC_JOB_STALE",
      details: { jobId: queuedJob.id, status: queuedJob.status },
      jobId: queuedJob.id,
      message: "Marketplace sync job is not queued.",
      provider: queuedJob.provider,
      status: 409,
      userAction: "Create or retry a fresh marketplace sync job.",
    });
  }
  const permission = permissionForMarketplaceJob(queuedJob.jobType);
  assertPermission(context, permission);
  context.logger.info(
    "marketplace.sync_job.run.started",
    createServiceLogMetadata(context, {
      jobId: queuedJob.id,
      jobType: queuedJob.jobType,
      provider: queuedJob.provider,
    }),
  );
  const runningJob = await ports.marketplaceRepository.markJobRunning({
    jobId: input.jobId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  const gateway = ports.gatewayRegistry?.getGateway(runningJob.provider);
  if (!gateway) throw new MarketplaceProviderRuntimeError("Gateway missing.");

  try {
    const listingId = readString(runningJob.metadata.listingId);
    if (!listingId)
      throw new MarketplaceProviderRuntimeError("listingId missing.");
    const account = await ports.marketplaceRepository.findAccount({
      provider: runningJob.provider,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!account) throw new MarketplaceProviderRuntimeError("Account missing.");

    const [listing, providerListing] = await Promise.all([
      runningJob.jobType === "listing_unpublish"
        ? Promise.resolve(null)
        : ports.marketplaceRepository.findListingProjection({
            listingId,
            storeId: scope.storeId as never,
            tenantId: scope.tenantId as never,
          }),
      ports.marketplaceRepository.findProviderListing({
        accountId: account.id,
        listingId,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      }),
    ]);
    const metadataExternalId = readString(runningJob.metadata.externalId);
    const externalId =
      runningJob.jobType === "listing_publish"
        ? metadataExternalId
        : (metadataExternalId ?? readString(providerListing?.externalId));
    if (runningJob.jobType === "listing_unpublish" && !externalId) {
      throw new MarketplaceProviderRuntimeError(
        "externalId missing for listing unpublish.",
      );
    }
    const catalogMapping = listing
      ? await findCatalogMapping(ports, runningJob.provider, listing.catalog)
      : null;
    if (runningJob.jobType !== "listing_unpublish") {
      if (!listing) {
        throw new MarketplaceProviderRuntimeError("Listing missing.");
      }
      assertMarketplaceProjectionReady(runningJob, listing, catalogMapping);
    }

    const token = readMarketplaceAccountToken(account, runningJob.provider);
    const providerMapping =
      catalogMapping?.status === "resolved"
        ? { providerMapping: catalogMappingMetadata(catalogMapping) }
        : {};
    const result = await gateway.runListingSync({
      ...(externalId ? { externalId } : {}),
      jobType: runningJob.jobType,
      ...(listing ? { listing } : {}),
      metadata: { ...runningJob.metadata, ...providerMapping },
      token,
    });
    const completed = await ports.marketplaceRepository.markJobCompleted({
      completedAt: new Date(),
      externalId: result.externalId,
      jobId: runningJob.id,
      listingId,
      metadata: { ...runningJob.metadata, ...result.metadata },
      provider: runningJob.provider,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });

    await recordRunAudit(context, completed, "succeeded", null);
    return completed;
  } catch (error) {
    const failed = await ports.marketplaceRepository.markJobFailed({
      completedAt: new Date(),
      errorMessage: errorMessage(error),
      jobId: runningJob.id,
      metadata: { ...runningJob.metadata, ...safeErrorMetadata(error) },
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    await recordRunAudit(context, failed, "failed", errorMessage(error));
    return failed;
  }
}

function assertMarketplaceProjectionReady(
  job: MarketplaceJob,
  listing: MarketplaceListingProjection,
  catalogMapping: MarketplaceCatalogMapping | null,
) {
  if (job.jobType === "listing_unpublish") return;
  const blockers = listListingBlockers(listing, catalogMapping, job.provider);
  if (!blockers.length) return;
  throw new MarketplaceServiceError({
    code: "MARKETPLACE_LISTING_NOT_READY",
    details: {
      blockers: blockers.map((blockerItem) => ({
        code: blockerItem.code,
        field: blockerItem.field ?? null,
      })),
      listingId: listing.listingId,
      provider: job.provider,
    },
    jobId: job.id,
    listingId: listing.listingId,
    message: blockers[0]?.message ?? "Marketplace listing is not ready.",
    provider: job.provider,
    status: 400,
    userAction:
      blockers[0]?.userAction ??
      "Fix the listing blockers before running marketplace sync.",
  });
}

async function findCatalogMapping(
  ports: MarketplaceServicePorts,
  provider: MarketplaceJob["provider"],
  catalog: MarketplaceCatalogSnapshot | null,
) {
  if (!catalog || catalog.source !== "fipe") return null;
  return ports.marketplaceRepository.findCatalogMapping({
    catalog,
    provider,
  });
}

function catalogMappingMetadata(mapping: MarketplaceCatalogMapping) {
  return {
    providerBrandCode: mapping.providerBrandCode,
    providerModelCode: mapping.providerModelCode,
    providerTrimCode: mapping.providerTrimCode,
    providerYearCode: mapping.providerYearCode,
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function safeErrorMetadata(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const record = error as Record<string, unknown>;
  return {
    providerResult: {
      ...(typeof record.code === "string"
        ? { providerStatus: record.code }
        : {}),
      ...(typeof record.requestId === "string"
        ? { providerRequestId: record.requestId }
        : {}),
    },
  };
}
