import type { PermissionKey } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type {
  MarketplaceJob,
  MarketplaceListingProjection,
  MarketplaceSyncJobType,
} from "../../ports/marketplaceRepository.js";
import {
  MarketplaceProviderRuntimeError,
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";

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
  const permission = permissionForJob(queuedJob.jobType);
  assertPermission(context, permission);
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
    if (runningJob.jobType !== "listing_unpublish") {
      if (!listing) {
        throw new MarketplaceProviderRuntimeError("Listing missing.");
      }
      assertMarketplaceProjectionReady(runningJob.jobType, listing);
    }

    const credentials = readCredentials(account.config);
    const connection = readObject(account.config.connection);
    const result = await gateway.runListingSync({
      ...(externalId ? { externalId } : {}),
      jobType: runningJob.jobType,
      ...(listing ? { listing } : {}),
      metadata: runningJob.metadata,
      token: {
        accessToken: credentials.accessToken,
        expiresAt: readDate(connection, "expiresAt"),
        providerAccountId: readString(connection.providerAccountId),
        refreshToken: credentials.refreshToken,
        scope: readString(connection.scope),
        tokenType: readString(connection.tokenType),
      },
    });
    const completed = await ports.marketplaceRepository.markJobCompleted({
      completedAt: new Date(),
      externalId: result.externalId,
      jobId: runningJob.id,
      listingId,
      metadata: { ...runningJob.metadata, providerResult: result.metadata },
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
      metadata: runningJob.metadata,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    await recordRunAudit(context, failed, "failed", errorMessage(error));
    return failed;
  }
}

function assertMarketplaceProjectionReady(
  jobType: MarketplaceSyncJobType,
  listing: MarketplaceListingProjection,
) {
  if (jobType === "listing_unpublish") return;
  if (listing.status !== "published" || !listing.isVisibleOnPublicSite) {
    throw new MarketplaceProviderRuntimeError(
      "Listing must be published and public-visible before marketplace sync.",
    );
  }
  if (listing.mediaUrls.length === 0) {
    throw new MarketplaceProviderRuntimeError(
      "Listing must have at least one public photo before marketplace sync.",
    );
  }
}

async function recordRunAudit(
  context: ServiceContext,
  job: MarketplaceJob,
  outcome: "failed" | "succeeded",
  errorMessage: string | null,
) {
  context.logger.info(
    "marketplace.sync_job.run",
    createServiceLogMetadata(context, {
      jobId: job.id,
      jobType: job.jobType,
      outcome,
      provider: job.provider,
    }),
  );

  await context.audit.record({
    action: "marketplace.sync_job.run",
    actor: context.actor,
    category: "data_change",
    entityId: job.id,
    entityType: "marketplace_job",
    metadata: {
      errorMessage,
      jobType: job.jobType,
      permission: permissionForJob(job.jobType),
      provider: job.provider,
      status: job.status,
    },
    outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
    summary: "Ran marketplace provider sync job",
  });
}

function permissionForJob(jobType: MarketplaceJob["jobType"]): PermissionKey {
  if (jobType === "inventory_sync") return "marketplace.inventory_sync";
  if (jobType === "lead_sync") return "marketplace.lead_sync";
  if (jobType === "listing_publish") return "marketplace.listing_publish";
  if (jobType === "listing_unpublish") {
    return "marketplace.listing_unpublish";
  }
  return "marketplace.listing_update";
}

function readCredentials(config: Record<string, unknown>) {
  const credentials = readObject(config.credentials);
  const accessToken = readString(credentials.accessToken);
  if (!accessToken) throw new MarketplaceProviderRuntimeError("Token missing.");
  return {
    accessToken,
    refreshToken: readString(credentials.refreshToken),
  };
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readDate(value: unknown, key: string): Date | null {
  if (!value || typeof value !== "object") return null;
  const raw = readString((value as Record<string, unknown>)[key]);
  return raw ? new Date(raw) : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
