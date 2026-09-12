import type { MarketplacePublishInput } from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";
import {
  duplicateExternalId,
  MarketplaceProviderGatewayError,
  readString,
} from "./httpMarketplaceProviderGatewaySupport.js";

const SUCCESS_STATUSES = new Set([
  "accepted",
  "active",
  "closed",
  "deleted",
  "inactive",
  "paused",
  "published",
  "under_review",
  "unpublished",
  "updated",
]);
const REJECTED_STATUSES = new Set(["error", "failed", "failure", "rejected"]);

export async function readMarketplaceResponsePayload(response: Response) {
  const payload: unknown = await response.json().catch(() => null);
  return isRecord(payload) ? payload : {};
}

export function marketplaceProviderSuccessEvidence(
  provider: MarketplaceProvider,
  input: MarketplacePublishInput,
  response: Response,
  payload: Record<string, unknown>,
) {
  if (
    input.jobType === "listing_unpublish" &&
    response.status === 204 &&
    input.externalId
  ) {
    return { externalId: input.externalId, providerStatus: "unpublished" };
  }

  const returnedId = duplicateExternalId(payload);
  const providerStatus = readString(payload.status)?.toLowerCase() ?? null;
  if (providerStatus && REJECTED_STATUSES.has(providerStatus)) {
    throw evidenceError(provider, "rejected", providerStatus);
  }
  const externalId =
    input.jobType === "listing_publish" ? returnedId : input.externalId;
  if (
    !externalId ||
    !providerStatus ||
    !SUCCESS_STATUSES.has(providerStatus) ||
    (returnedId && input.externalId && returnedId !== input.externalId)
  ) {
    throw evidenceError(provider, "invalid");
  }
  return { externalId, providerStatus };
}

function evidenceError(
  provider: MarketplaceProvider,
  kind: "invalid" | "rejected",
  providerStatus?: string,
) {
  const rejected = kind === "rejected";
  return new MarketplaceProviderGatewayError(
    rejected
      ? "MARKETPLACE_PROVIDER_VALIDATION_FAILED"
      : "MARKETPLACE_PROVIDER_UNAVAILABLE",
    rejected
      ? "Marketplace provider rejected the listing operation."
      : "Marketplace provider returned invalid operation evidence.",
    provider,
    rejected ? 400 : 502,
    { provider, ...(providerStatus ? { providerStatus } : {}) },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
