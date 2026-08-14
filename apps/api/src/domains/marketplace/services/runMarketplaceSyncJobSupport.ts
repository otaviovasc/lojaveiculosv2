import type {
  MarketplaceCatalogMapping,
  MarketplaceCatalogSnapshot,
  MarketplaceJob,
  MarketplaceListingProjection,
} from "../ports/marketplaceRepository.js";
import { MarketplaceServiceError } from "./MarketplaceService/marketplaceErrors.js";
import { listListingBlockers } from "./MarketplaceService/marketplaceStockPlanRules.js";
import type { MarketplaceServicePorts } from "./MarketplaceService/serviceSupport.js";

export function assertMarketplaceProjectionReady(
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
      blockers: blockers.map((item) => ({
        code: item.code,
        field: item.field ?? null,
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

export async function findCatalogMapping(
  ports: MarketplaceServicePorts,
  provider: MarketplaceJob["provider"],
  catalog: MarketplaceCatalogSnapshot | null,
) {
  if (!catalog || catalog.source !== "fipe") return null;
  return ports.marketplaceRepository.findCatalogMapping({ catalog, provider });
}

export function catalogMappingMetadata(mapping: MarketplaceCatalogMapping) {
  return {
    providerBrandCode: mapping.providerBrandCode,
    providerModelCode: mapping.providerModelCode,
    providerTrimCode: mapping.providerTrimCode,
    providerYearCode: mapping.providerYearCode,
  };
}

export function readJobCatalogMapping(
  provider: MarketplaceJob["provider"],
  catalog: MarketplaceCatalogSnapshot | null,
  metadata: Record<string, unknown>,
): MarketplaceCatalogMapping | null {
  if (!catalog || catalog.source !== "fipe") return null;
  const raw = metadata.providerMapping;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const mapping = raw as Record<string, unknown>;
  const providerBrandCode = readString(mapping.providerBrandCode);
  const providerModelCode = readString(mapping.providerModelCode);
  const providerTrimCode = readString(mapping.providerTrimCode);
  const providerYearCode = readString(mapping.providerYearCode);
  if (
    !catalog.brandCode ||
    !catalog.fipeCode ||
    !catalog.modelCode ||
    !catalog.yearCode ||
    !catalog.vehicleType ||
    !providerBrandCode ||
    !providerModelCode ||
    !providerTrimCode ||
    (provider !== "olx" && !providerYearCode)
  ) {
    return null;
  }
  return {
    fipeBrandCode: catalog.brandCode,
    fipeCode: catalog.fipeCode,
    fipeModelCode: catalog.modelCode,
    fipeYearCode: catalog.yearCode,
    provider,
    providerBrandCode,
    providerModelCode,
    providerTrimCode,
    providerYearCode,
    status: "resolved",
    unresolvedReason: null,
    vehicleType: catalog.vehicleType,
  };
}

export function hasMarketplaceErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" && code.startsWith("MARKETPLACE_");
}

export function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function safeErrorMetadata(error: unknown) {
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

export function staleDispatchClaim(job: MarketplaceJob) {
  return new MarketplaceServiceError({
    code: "MARKETPLACE_SYNC_JOB_STALE",
    details: { jobId: job.id },
    jobId: job.id,
    message: "Marketplace dispatch claim is no longer active.",
    provider: job.provider,
    status: 409,
    userAction: "Refresh the marketplace job before taking another action.",
  });
}

export function isIndeterminateProviderError(error: unknown) {
  if (!error || typeof error !== "object") return true;
  const code = (error as Record<string, unknown>).code;
  return code === undefined || code === "MARKETPLACE_PROVIDER_UNAVAILABLE";
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
