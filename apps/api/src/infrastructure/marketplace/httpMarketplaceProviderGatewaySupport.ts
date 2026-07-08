import type { MarketplaceServiceErrorCode } from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { MarketplaceProvider } from "../../domains/marketplace/ports/marketplaceRepository.js";

export class MarketplaceProviderGatewayError extends Error {
  constructor(
    readonly code: MarketplaceServiceErrorCode,
    message: string,
    readonly provider: MarketplaceProvider,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "MarketplaceProviderGatewayError";
  }

  static notConfigured(provider: MarketplaceProvider) {
    return new MarketplaceProviderGatewayError(
      "MARKETPLACE_PROVIDER_NOT_CONFIGURED",
      `Marketplace provider ${provider} is not configured.`,
      provider,
      500,
    );
  }

  static contractMissing(provider: MarketplaceProvider) {
    return new MarketplaceProviderGatewayError(
      "MARKETPLACE_PROVIDER_CONTRACT_MISSING",
      `Marketplace provider ${provider} contract config is missing.`,
      provider,
      500,
    );
  }
}

export const MarketplaceProviderHttpError = MarketplaceProviderGatewayError;

export class MarketplaceProviderPayloadError extends Error {
  constructor(jobType: string) {
    super(`Marketplace listing payload is required for ${jobType}.`);
    this.name = "MarketplaceProviderPayloadError";
  }
}

export function providerHttpError(
  provider: MarketplaceProvider,
  response: Response,
  payload: Record<string, unknown>,
  options: { tokenRefresh?: boolean } = {},
) {
  if (options.tokenRefresh) {
    return new MarketplaceProviderGatewayError(
      "MARKETPLACE_TOKEN_REFRESH_FAILED",
      "Marketplace provider token refresh failed.",
      provider,
      401,
    );
  }
  const retryAfterSeconds = retryAfter(response.headers.get("retry-after"));
  const details = sanitizedErrorDetails(provider, payload, retryAfterSeconds);
  return httpErrorForStatus(
    provider,
    response.status,
    details,
    retryAfterSeconds,
  );
}

export function sanitizedResult(
  externalId: string | null,
  response: Response,
  providerStatus: string,
) {
  return {
    externalId,
    providerRequestId: response.headers.get("x-request-id"),
    providerStatus,
  };
}

export function duplicateExternalId(payload: Record<string, unknown>) {
  return (
    readString(payload.id) ??
    readString(payload.item_id) ??
    readString(payload.existing_id) ??
    readString(payload.external_id)
  );
}

export function baseUrl(options: { baseUrl: string }) {
  return options.baseUrl.replace(/\/$/, "");
}

export function expiresAt(value: unknown) {
  return typeof value === "number" ? new Date(Date.now() + value * 1000) : null;
}

export function readString(value: unknown): string | null {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function httpErrorForStatus(
  provider: MarketplaceProvider,
  status: number,
  details: Record<string, unknown>,
  retryAfterSeconds: number | null,
) {
  if (status === 400) {
    return gatewayError(
      "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
      "Marketplace provider rejected the listing payload.",
      provider,
      400,
      details,
    );
  }
  if (status === 401) {
    return gatewayError(
      "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED",
      "Marketplace account must be reconnected.",
      provider,
      401,
      details,
    );
  }
  if (status === 403) {
    return gatewayError(
      "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED",
      "Marketplace account requirement blocked this operation.",
      provider,
      403,
      details,
    );
  }
  if (status === 404) {
    return gatewayError(
      "MARKETPLACE_LISTING_NOT_FOUND",
      "Marketplace external listing was not found.",
      provider,
      404,
      details,
    );
  }
  if (status === 409) {
    return gatewayError(
      "MARKETPLACE_PROVIDER_CONFLICT",
      "Marketplace provider reported a listing conflict.",
      provider,
      409,
      details,
    );
  }
  if (status === 429) {
    return gatewayError(
      "MARKETPLACE_PROVIDER_RATE_LIMITED",
      "Marketplace provider rate limit was reached.",
      provider,
      429,
      details,
      retryAfterSeconds,
    );
  }
  if (status >= 500) {
    return gatewayError(
      "MARKETPLACE_PROVIDER_UNAVAILABLE",
      "Marketplace provider is unavailable.",
      provider,
      503,
      details,
    );
  }
  return gatewayError(
    "MARKETPLACE_PROVIDER_VALIDATION_FAILED",
    "Marketplace provider request failed.",
    provider,
    status,
    details,
  );
}

function gatewayError(
  code: MarketplaceServiceErrorCode,
  message: string,
  provider: MarketplaceProvider,
  status: number,
  details: Record<string, unknown>,
  retryAfterSeconds: number | null = null,
) {
  return new MarketplaceProviderGatewayError(
    code,
    message,
    provider,
    status,
    details,
    retryAfterSeconds,
  );
}

function sanitizedErrorDetails(
  provider: MarketplaceProvider,
  payload: Record<string, unknown>,
  retryAfterSeconds: number | null,
) {
  const externalId = duplicateExternalId(payload);
  const providerStatus = readString(payload.error);
  return {
    ...(externalId ? { externalId } : {}),
    provider,
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    ...(providerStatus ? { providerStatus } : {}),
  };
}

function retryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds;
  const date = Date.parse(value);
  return Number.isFinite(date)
    ? Math.max(0, Math.ceil((date - Date.now()) / 1000))
    : null;
}
