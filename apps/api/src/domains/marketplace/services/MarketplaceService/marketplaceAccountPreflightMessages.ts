import type {
  MarketplaceAccountConnectionStatus,
  MarketplaceAccountRequirement,
  MarketplaceServiceErrorCode,
} from "../../ports/marketplaceRepository.js";

export function requirementForConnectionStatus(
  status: MarketplaceAccountConnectionStatus,
): MarketplaceAccountRequirement | null {
  switch (status) {
    case "connected":
    case "refreshable":
      return null;
    case "not_connected":
      return requirementForCode("MARKETPLACE_ACCOUNT_NOT_CONNECTED");
    case "paused":
      return requirementForCode("MARKETPLACE_ACCOUNT_PAUSED");
    case "reconnect_required":
      return requirementForCode("MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED");
    case "blocked":
      return requirementForCode("MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED");
    case "degraded":
      return requirementForCode("MARKETPLACE_PROVIDER_UNAVAILABLE");
    case "not_configured":
      return requirementForCode("MARKETPLACE_PROVIDER_NOT_CONFIGURED");
  }
}

export function requirementForCode(
  code: MarketplaceServiceErrorCode,
): MarketplaceAccountRequirement {
  return {
    code,
    message: safeMessageForCode(code),
    severity: severityForCode(code),
    userAction: userActionForCode(code),
  };
}

export function safeMessageForCode(
  code: MarketplaceServiceErrorCode,
  fallback?: string,
) {
  if (
    fallback &&
    (code === "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED" ||
      code === "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED")
  ) {
    return fallback;
  }
  switch (code) {
    case "MARKETPLACE_ACCOUNT_NOT_CONNECTED":
      return "Marketplace account is not connected.";
    case "MARKETPLACE_ACCOUNT_PAUSED":
      return "Marketplace account is paused.";
    case "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED":
      return "Marketplace account must be reconnected.";
    case "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED":
      return "Marketplace account requirements were not met.";
    case "MARKETPLACE_LISTING_NOT_READY":
      return "Marketplace listing is not ready for synchronization.";
    case "MARKETPLACE_LISTING_NOT_FOUND":
      return "Marketplace listing was not found.";
    case "MARKETPLACE_LISTING_MAPPING_REQUIRED":
      return "Marketplace listing requires a vehicle mapping.";
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
      return "Marketplace provider is not configured on the server.";
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
      return "Marketplace provider contract config is missing.";
    case "MARKETPLACE_PROVIDER_VALIDATION_FAILED":
      return "Marketplace provider rejected the request data.";
    case "MARKETPLACE_PROVIDER_CONFLICT":
      return "Marketplace provider reported a conflicting operation.";
    case "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED":
      return "Marketplace account requirement blocked this operation.";
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
      return "Marketplace provider rate limit was reached.";
    case "MARKETPLACE_PROVIDER_UNAVAILABLE":
      return "Marketplace provider is unavailable.";
    case "MARKETPLACE_TOKEN_REFRESH_FAILED":
      return "Marketplace account token could not be refreshed.";
    case "MARKETPLACE_SYNC_JOB_INVALID_METADATA":
      return "Marketplace sync job metadata is invalid.";
    case "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE":
      return "Marketplace sync job cannot be retried.";
    case "MARKETPLACE_SYNC_JOB_STALE":
      return "Marketplace sync job is stale.";
    case "MARKETPLACE_SYNC_PARTIAL_FAILURE":
      return "Marketplace synchronization completed with failures.";
    case "MARKETPLACE_REQUEST_VALIDATION_FAILED":
      return "Marketplace request data is invalid.";
  }
}

export function userActionForCode(code: MarketplaceServiceErrorCode) {
  switch (code) {
    case "MARKETPLACE_ACCOUNT_NOT_CONNECTED":
      return "Connect the marketplace account before syncing stock.";
    case "MARKETPLACE_ACCOUNT_PAUSED":
      return "Activate the marketplace account before syncing stock.";
    case "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED":
      return "Reconnect the marketplace account before syncing stock.";
    case "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED":
      return "Review the marketplace account requirements before syncing stock.";
    case "MARKETPLACE_LISTING_NOT_READY":
      return "Complete the listing requirements before syncing stock.";
    case "MARKETPLACE_LISTING_NOT_FOUND":
      return "Create or reconnect the marketplace listing before syncing stock.";
    case "MARKETPLACE_LISTING_MAPPING_REQUIRED":
      return "Map the marketplace listing to a vehicle before syncing stock.";
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
      return "Ask an admin to configure this marketplace provider.";
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
      return "Ask an admin to configure the provider contract requirements.";
    case "MARKETPLACE_PROVIDER_VALIDATION_FAILED":
      return "Review the listing data required by the marketplace provider.";
    case "MARKETPLACE_PROVIDER_CONFLICT":
      return "Review the conflicting marketplace operation before retrying.";
    case "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED":
      return "Resolve the provider account requirement before syncing stock.";
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
      return "Wait for the provider rate limit window before retrying.";
    case "MARKETPLACE_PROVIDER_UNAVAILABLE":
      return "Try again after the marketplace provider is available.";
    case "MARKETPLACE_TOKEN_REFRESH_FAILED":
      return "Reconnect the marketplace account before syncing stock.";
    case "MARKETPLACE_SYNC_JOB_INVALID_METADATA":
      return "Start a new marketplace sync with valid job data.";
    case "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE":
      return "Start a new marketplace sync instead of retrying this job.";
    case "MARKETPLACE_SYNC_JOB_STALE":
      return "Start a new marketplace sync to replace the stale job.";
    case "MARKETPLACE_SYNC_PARTIAL_FAILURE":
      return "Review failed listings and retry only the recoverable items.";
    case "MARKETPLACE_REQUEST_VALIDATION_FAILED":
      return "Review the marketplace request data before retrying.";
  }
}

export function connectionStatusForCode(
  code: MarketplaceServiceErrorCode,
): MarketplaceAccountConnectionStatus {
  switch (code) {
    case "MARKETPLACE_ACCOUNT_NOT_CONNECTED":
      return "not_connected";
    case "MARKETPLACE_ACCOUNT_PAUSED":
      return "paused";
    case "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED":
    case "MARKETPLACE_TOKEN_REFRESH_FAILED":
      return "reconnect_required";
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
      return "not_configured";
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
    case "MARKETPLACE_PROVIDER_UNAVAILABLE":
      return "degraded";
    case "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED":
    case "MARKETPLACE_LISTING_NOT_READY":
    case "MARKETPLACE_LISTING_NOT_FOUND":
    case "MARKETPLACE_LISTING_MAPPING_REQUIRED":
    case "MARKETPLACE_PROVIDER_VALIDATION_FAILED":
    case "MARKETPLACE_PROVIDER_CONFLICT":
    case "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED":
    case "MARKETPLACE_SYNC_JOB_INVALID_METADATA":
    case "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE":
    case "MARKETPLACE_SYNC_JOB_STALE":
    case "MARKETPLACE_SYNC_PARTIAL_FAILURE":
    case "MARKETPLACE_REQUEST_VALIDATION_FAILED":
      return "blocked";
  }
}

export function statusForCode(code: MarketplaceServiceErrorCode) {
  switch (code) {
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
    case "MARKETPLACE_PROVIDER_UNAVAILABLE":
      return 503;
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
      return 429;
    case "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED":
    case "MARKETPLACE_TOKEN_REFRESH_FAILED":
      return 401;
    case "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED":
      return 403;
    case "MARKETPLACE_ACCOUNT_NOT_CONNECTED":
    case "MARKETPLACE_ACCOUNT_PAUSED":
    case "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED":
    case "MARKETPLACE_LISTING_NOT_READY":
    case "MARKETPLACE_LISTING_NOT_FOUND":
    case "MARKETPLACE_LISTING_MAPPING_REQUIRED":
    case "MARKETPLACE_PROVIDER_VALIDATION_FAILED":
    case "MARKETPLACE_PROVIDER_CONFLICT":
    case "MARKETPLACE_SYNC_JOB_INVALID_METADATA":
    case "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE":
    case "MARKETPLACE_SYNC_JOB_STALE":
    case "MARKETPLACE_SYNC_PARTIAL_FAILURE":
    case "MARKETPLACE_REQUEST_VALIDATION_FAILED":
      return 400;
  }
}

export function isMarketplaceErrorCode(
  code: unknown,
): code is MarketplaceServiceErrorCode {
  return (
    typeof code === "string" &&
    Object.prototype.hasOwnProperty.call(marketplaceErrorCodeLookup, code)
  );
}

function severityForCode(
  code: MarketplaceServiceErrorCode,
): MarketplaceAccountRequirement["severity"] {
  if (code === "MARKETPLACE_PROVIDER_RATE_LIMITED") return "warning";
  return "blocked";
}

const marketplaceErrorCodeLookup = {
  MARKETPLACE_ACCOUNT_NOT_CONNECTED: true,
  MARKETPLACE_ACCOUNT_PAUSED: true,
  MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED: true,
  MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED: true,
  MARKETPLACE_LISTING_NOT_READY: true,
  MARKETPLACE_LISTING_NOT_FOUND: true,
  MARKETPLACE_LISTING_MAPPING_REQUIRED: true,
  MARKETPLACE_PROVIDER_NOT_CONFIGURED: true,
  MARKETPLACE_PROVIDER_CONTRACT_MISSING: true,
  MARKETPLACE_PROVIDER_VALIDATION_FAILED: true,
  MARKETPLACE_PROVIDER_CONFLICT: true,
  MARKETPLACE_PROVIDER_RATE_LIMITED: true,
  MARKETPLACE_PROVIDER_UNAVAILABLE: true,
  MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED: true,
  MARKETPLACE_TOKEN_REFRESH_FAILED: true,
  MARKETPLACE_SYNC_JOB_INVALID_METADATA: true,
  MARKETPLACE_SYNC_JOB_NOT_RETRYABLE: true,
  MARKETPLACE_SYNC_JOB_STALE: true,
  MARKETPLACE_SYNC_PARTIAL_FAILURE: true,
  MARKETPLACE_REQUEST_VALIDATION_FAILED: true,
} satisfies Record<MarketplaceServiceErrorCode, true>;
