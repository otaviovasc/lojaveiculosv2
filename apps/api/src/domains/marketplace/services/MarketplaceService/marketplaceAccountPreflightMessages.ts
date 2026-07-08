import type {
  MarketplaceAccountConnectionStatus,
  MarketplaceAccountRequirement,
  MarketplaceServiceErrorCode,
} from "../../ports/marketplaceRepository.js";

export function requirementForConnectionStatus(
  status: MarketplaceAccountConnectionStatus,
): MarketplaceAccountRequirement | null {
  if (status === "connected" || status === "refreshable") return null;
  if (status === "not_connected") {
    return requirementForCode("MARKETPLACE_ACCOUNT_NOT_CONNECTED");
  }
  if (status === "paused")
    return requirementForCode("MARKETPLACE_ACCOUNT_PAUSED");
  if (status === "reconnect_required") {
    return requirementForCode("MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED");
  }
  if (status === "blocked") {
    return requirementForCode("MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED");
  }
  if (status === "degraded") {
    return requirementForCode("MARKETPLACE_PROVIDER_UNAVAILABLE");
  }
  return requirementForCode("MARKETPLACE_PROVIDER_NOT_CONFIGURED");
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
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
      return "Marketplace provider is not configured on the server.";
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
      return "Marketplace provider contract config is missing.";
    case "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED":
      return "Marketplace account requirement blocked this operation.";
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
      return "Marketplace provider rate limit was reached.";
    case "MARKETPLACE_PROVIDER_UNAVAILABLE":
      return "Marketplace provider is unavailable.";
    default:
      return fallback || "Marketplace account requirement must be reviewed.";
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
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
      return "Ask an admin to configure this marketplace provider.";
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
      return "Ask an admin to configure the provider contract requirements.";
    case "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED":
      return "Resolve the provider account requirement before syncing stock.";
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
      return "Wait for the provider rate limit window before retrying.";
    case "MARKETPLACE_PROVIDER_UNAVAILABLE":
      return "Try again after the marketplace provider is available.";
    default:
      return "Review the marketplace account requirements before syncing stock.";
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
    default:
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
    default:
      return 400;
  }
}

export function isMarketplaceErrorCode(
  code: unknown,
): code is MarketplaceServiceErrorCode {
  return typeof code === "string" && marketplaceErrorCodes.has(code);
}

function severityForCode(
  code: MarketplaceServiceErrorCode,
): MarketplaceAccountRequirement["severity"] {
  if (code === "MARKETPLACE_PROVIDER_RATE_LIMITED") return "warning";
  return "blocked";
}

const marketplaceErrorCodes = new Set<string>([
  "MARKETPLACE_ACCOUNT_NOT_CONNECTED",
  "MARKETPLACE_ACCOUNT_PAUSED",
  "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED",
  "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED",
  "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
  "MARKETPLACE_PROVIDER_CONTRACT_MISSING",
  "MARKETPLACE_PROVIDER_RATE_LIMITED",
  "MARKETPLACE_PROVIDER_UNAVAILABLE",
  "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED",
  "MARKETPLACE_TOKEN_REFRESH_FAILED",
]);
