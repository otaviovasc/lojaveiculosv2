import type { Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import { MarketplaceAccountMissingError } from "../../../domains/marketplace/ports/marketplaceRepository.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { MarketplaceServiceError } from "../../../domains/marketplace/services/MarketplaceService/marketplaceErrors.js";
import {
  MarketplaceProviderRuntimeError,
  MarketplaceScopeError,
} from "../../../domains/marketplace/services/MarketplaceService/serviceSupport.js";

export class MarketplaceRequestValidationError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "MarketplaceRequestValidationError";
    if (details) this.details = details;
  }
}

export function marketplaceErrorResponse(context: Context, error: unknown) {
  if (error instanceof MarketplaceRequestValidationError) {
    return jsonApiError(context, {
      code: "MARKETPLACE_REQUEST_VALIDATION_FAILED",
      ...(error.details ? { details: error.details } : {}),
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof MarketplaceServiceError) {
    return jsonApiError(context, {
      code: error.code,
      details: serviceErrorDetails(error),
      error,
      message: error.message,
      status: error.status as never,
    });
  }
  const gatewayError = readGatewayError(error);
  if (gatewayError) {
    return jsonApiError(context, {
      code: gatewayError.code,
      ...(gatewayError.details ? { details: gatewayError.details } : {}),
      error,
      message: gatewayError.message,
      status: gatewayError.status as never,
    });
  }
  if (error instanceof MarketplaceAccountMissingError) {
    return jsonApiError(context, {
      code: "MARKETPLACE_ACCOUNT_NOT_CONNECTED",
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof MarketplaceScopeError) {
    return jsonApiError(context, {
      code: "MARKETPLACE_REQUEST_VALIDATION_FAILED",
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof MarketplaceProviderRuntimeError) {
    return jsonApiError(context, {
      code: marketplaceRuntimeCode(error),
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof HttpContextAuthenticationError) {
    return jsonApiError(context, {
      code: "HTTP_AUTHENTICATION_REQUIRED",
      error,
      message: error.message,
      status: 401,
    });
  }
  if (
    error instanceof AuthorizationError ||
    error instanceof HttpContextAuthorizationError
  ) {
    return jsonApiError(context, {
      code: "AUTHORIZATION_DENIED",
      error,
      message: error.message,
      status: 403,
    });
  }
  return jsonApiError(context, {
    code: "INTERNAL_SERVER_ERROR",
    error,
    message: "Internal server error.",
    status: 500,
  });
}

function readGatewayError(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const record = error as Record<string, unknown>;
  if (
    typeof record.code !== "string" ||
    !record.code.startsWith("MARKETPLACE_") ||
    typeof record.message !== "string" ||
    typeof record.status !== "number"
  ) {
    return null;
  }
  return {
    code: record.code,
    details:
      record.details && typeof record.details === "object"
        ? {
            ...(record.details as Record<string, unknown>),
            ...(typeof record.provider === "string"
              ? { provider: record.provider }
              : {}),
            ...(typeof record.retryAfterSeconds === "number"
              ? { retryAfterSeconds: record.retryAfterSeconds }
              : {}),
          }
        : {
            ...(typeof record.provider === "string"
              ? { provider: record.provider }
              : {}),
            ...(typeof record.retryAfterSeconds === "number"
              ? { retryAfterSeconds: record.retryAfterSeconds }
              : {}),
          },
    message: record.message,
    status: record.status,
  };
}

function serviceErrorDetails(error: MarketplaceServiceError) {
  return {
    ...(error.details ?? {}),
    ...(error.jobId ? { jobId: error.jobId } : {}),
    ...(error.listingId ? { listingId: error.listingId } : {}),
    ...(error.provider ? { provider: error.provider } : {}),
    ...(error.requestId ? { requestId: error.requestId } : {}),
    ...(typeof error.retryAfterSeconds === "number"
      ? { retryAfterSeconds: error.retryAfterSeconds }
      : {}),
    userAction: error.userAction,
  };
}

function marketplaceRuntimeCode(error: MarketplaceProviderRuntimeError) {
  if (error.message.includes("Gateway missing")) {
    return "MARKETPLACE_PROVIDER_NOT_CONFIGURED";
  }
  if (error.message.includes("listingId missing")) {
    return "MARKETPLACE_SYNC_JOB_INVALID_METADATA";
  }
  if (error.message.includes("Listing missing")) {
    return "MARKETPLACE_LISTING_NOT_FOUND";
  }
  if (error.message.includes("public")) return "MARKETPLACE_LISTING_NOT_READY";
  return "MARKETPLACE_PROVIDER_VALIDATION_FAILED";
}
