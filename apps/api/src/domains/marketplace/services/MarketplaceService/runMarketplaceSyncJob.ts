import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { MarketplaceJob } from "../../ports/marketplaceRepository.js";
import { createOlxProviderListingId } from "../../payloads/marketplaceListingPayload.js";
import {
  MarketplaceProviderRuntimeError,
  requireMarketplaceScope,
  type MarketplaceServicePorts,
} from "./serviceSupport.js";
import { MarketplaceServiceError } from "./marketplaceErrors.js";
import { claimMarketplaceSyncJob } from "./claimMarketplaceSyncJob.js";
import {
  assertMarketplaceAccountPreflightReady,
  readMarketplaceAccountToken,
} from "./marketplaceAccountPreflight.js";
import { isCatalogMappingResolvedForProvider } from "./marketplaceStockPlanRules.js";
import { recordRunAudit } from "./runMarketplaceSyncJobAudit.js";
import {
  assertMarketplaceProjectionReady,
  catalogMappingMetadata,
  errorMessage,
  findCatalogMapping,
  isIndeterminateProviderError,
  readJobCatalogMapping,
  readRecord,
  readString,
  safeErrorMetadata,
  staleDispatchClaim,
} from "../runMarketplaceSyncJobSupport.js";

export type RunMarketplaceSyncJobInput = {
  jobId: string;
};

export async function runMarketplaceSyncJob(
  context: ServiceContext,
  input: RunMarketplaceSyncJobInput,
  ports: MarketplaceServicePorts,
): Promise<MarketplaceJob> {
  const scope = requireMarketplaceScope(context);
  const claim = await claimMarketplaceSyncJob(context, input, scope, ports);
  const runningJob = claim.job;
  const gateway = ports.gatewayRegistry?.getGateway(runningJob.provider);
  if (!gateway) throw new MarketplaceProviderRuntimeError("Gateway missing.");

  let providerCallStarted = false;
  let effectExternalId: string | null = null;
  let effectListingId: string | null = null;
  try {
    const listingId = readString(runningJob.metadata.listingId);
    if (!listingId)
      throw new MarketplaceProviderRuntimeError("listingId missing.");
    effectListingId = listingId;
    const account = await ports.marketplaceRepository.findAccountById({
      accountId: runningJob.accountId,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!account) throw new MarketplaceProviderRuntimeError("Account missing.");
    await assertMarketplaceAccountPreflightReady({
      account,
      ...(ports.gatewayRegistry
        ? { gatewayRegistry: ports.gatewayRegistry }
        : {}),
      provider: runningJob.provider,
    });

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
    const externalId =
      runningJob.jobType === "listing_publish"
        ? undefined
        : readString(providerListing?.externalId);
    if (runningJob.jobType === "listing_unpublish" && !externalId) {
      throw new MarketplaceProviderRuntimeError(
        "externalId missing for listing unpublish.",
      );
    }
    effectExternalId =
      externalId ??
      (runningJob.provider === "olx"
        ? createOlxProviderListingId(listingId)
        : null);
    const persistedCatalogMapping = listing
      ? await findCatalogMapping(ports, runningJob.provider, listing.catalog)
      : null;
    const jobCatalogMapping = listing
      ? readJobCatalogMapping(
          runningJob.provider,
          listing.catalog,
          runningJob.metadata,
        )
      : null;
    const catalogMapping = isCatalogMappingResolvedForProvider(
      persistedCatalogMapping,
      runningJob.provider,
    )
      ? persistedCatalogMapping
      : jobCatalogMapping;
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
    providerCallStarted = true;
    const result = await gateway.runListingSync({
      ...(externalId ? { externalId } : {}),
      jobType: runningJob.jobType,
      ...(listing ? { listing } : {}),
      metadata: { ...runningJob.metadata, ...providerMapping },
      token,
    });
    if (result.providerStatus === "submitted") {
      if (!result.operationToken) {
        throw new MarketplaceServiceError({
          code: "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
          jobId: runningJob.id,
          message: "Marketplace provider omitted the status operation token.",
          provider: runningJob.provider,
          status: 502,
          userAction:
            "Do not resend automatically. Review the provider connection and try again only after confirming no operation exists.",
        });
      }
      const submitted = await ports.marketplaceRepository.markJobSubmitted({
        dispatchLeaseOwner: claim.dispatchLeaseOwner,
        jobId: runningJob.id,
        listingId,
        metadata: {
          ...runningJob.metadata,
          ...result.metadata,
          providerResult: {
            ...readRecord(result.metadata.providerResult),
            externalId: result.externalId,
          },
        },
        nextAttemptAt: new Date(Date.now() + 60_000),
        operationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
        operationToken: result.operationToken,
        provider: runningJob.provider,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!submitted) throw staleDispatchClaim(runningJob);
      await recordRunAudit(context, submitted, "submitted", null);
      return submitted;
    }
    const completed = await ports.marketplaceRepository.markJobCompleted({
      completedAt: new Date(),
      dispatchLeaseOwner: claim.dispatchLeaseOwner,
      externalId: result.externalId,
      jobId: runningJob.id,
      listingId,
      metadata: { ...runningJob.metadata, ...result.metadata },
      provider: runningJob.provider,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!completed) throw staleDispatchClaim(runningJob);

    await recordRunAudit(context, completed, "succeeded", null);
    return completed;
  } catch (error) {
    const current = await ports.marketplaceRepository.findSyncJob({
      jobId: runningJob.id,
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (current && current.status !== "running") return current;
    if (
      providerCallStarted &&
      effectListingId &&
      isIndeterminateProviderError(error)
    ) {
      const submitted = await ports.marketplaceRepository.markJobSubmitted({
        dispatchLeaseOwner: claim.dispatchLeaseOwner,
        jobId: runningJob.id,
        listingId: effectListingId,
        metadata: {
          ...runningJob.metadata,
          providerResult: {
            externalId: effectExternalId,
            providerRequestId: null,
            providerStatus: "indeterminate",
          },
          reconciliationRequired: true,
        },
        nextAttemptAt: new Date(Date.now() + 60_000),
        operationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
        operationToken: null,
        provider: runningJob.provider,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!submitted) throw staleDispatchClaim(runningJob);
      await recordRunAudit(
        context,
        submitted,
        "submitted",
        "Provider outcome requires reconciliation.",
      );
      return submitted;
    }
    const failed = await ports.marketplaceRepository.markJobFailed({
      completedAt: new Date(),
      dispatchLeaseOwner: claim.dispatchLeaseOwner,
      errorMessage: errorMessage(error),
      jobId: runningJob.id,
      metadata: { ...runningJob.metadata, ...safeErrorMetadata(error) },
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    });
    if (!failed) throw staleDispatchClaim(runningJob);
    await recordRunAudit(context, failed, "failed", errorMessage(error));
    return failed;
  }
}
