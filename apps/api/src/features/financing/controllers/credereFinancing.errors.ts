import type { Context } from "hono";
import { FinancingProviderGatewayError } from "../../../domains/financing/ports/financingProviderGateway.js";
import {
  FinancingConnectionMissingError,
  FinancingConsentRequiredError,
  FinancingGatewayMissingError,
  FinancingIdempotencyConflictError,
  FinancingNoUsableBanksError,
  FinancingOAuthStateInvalidError,
  FinancingOperationInProgressError,
  FinancingProviderMappingRequiredError,
  FinancingScopeError,
  FinancingValidationError,
} from "../../../domains/financing/services/FinancingService/serviceSupport.js";
import { apiErrorInput } from "../../../infrastructure/http/commonApiErrorResponse.js";
import {
  commonApiErrorResponse,
  handleControllerAction,
} from "../../../infrastructure/http/commonApiErrorResponse.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";

export class CredereFinancingRequestValidationError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "CredereFinancingRequestValidationError";
    if (details) this.details = details;
  }
}

export class CredereFinancingConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredereFinancingConfigurationError";
  }
}

export class CredereFinancingInquiryNotFoundError extends Error {
  constructor(inquiryId: string) {
    super(`Credere financing inquiry ${inquiryId} was not found.`);
    this.name = "CredereFinancingInquiryNotFoundError";
  }
}

export function handleCredereFinancing(
  context: Context,
  action: () => Promise<Response>,
) {
  return handleControllerAction(context, action, mapCredereFinancingError);
}

function mapCredereFinancingError(error: unknown) {
  if (error instanceof CredereFinancingRequestValidationError) {
    return {
      code: "FINANCING_REQUEST_VALIDATION_FAILED",
      ...(error.details ? { details: error.details } : {}),
      error,
      message: error.message,
      status: 400 as const,
    };
  }

  if (error instanceof CredereFinancingConfigurationError) {
    return apiErrorInput(error, "CREDERE_FINANCING_UNAVAILABLE", 503);
  }

  if (error instanceof CredereFinancingInquiryNotFoundError) {
    return apiErrorInput(error, "CREDERE_FINANCING_INQUIRY_NOT_FOUND", 404);
  }

  if (error instanceof FinancingProviderGatewayError) {
    const details = safeDetails(error.details, error.retryAfterSeconds);
    return {
      code: providerGatewayCode(error),
      ...(details ? { details } : {}),
      error,
      message: error.message,
      status: providerGatewayStatus(error),
    };
  }

  if (
    error instanceof FinancingProviderMappingRequiredError ||
    error instanceof FinancingNoUsableBanksError ||
    error instanceof FinancingIdempotencyConflictError ||
    error instanceof FinancingOperationInProgressError ||
    error instanceof FinancingConnectionMissingError
  ) {
    return apiErrorInput(error, financingConflictCode(error), 409);
  }

  if (error instanceof FinancingConsentRequiredError) {
    return apiErrorInput(error, "FINANCING_CONSENT_REQUIRED", 422);
  }

  if (error instanceof FinancingValidationError) {
    return apiErrorInput(error, "FINANCING_VALIDATION_FAILED", 422);
  }

  if (error instanceof FinancingOAuthStateInvalidError) {
    return apiErrorInput(error, "FINANCING_OAUTH_STATE_INVALID", 400);
  }

  if (
    error instanceof FinancingGatewayMissingError ||
    error instanceof FinancingScopeError
  ) {
    return apiErrorInput(error, "CREDERE_FINANCING_UNAVAILABLE", 503);
  }

  const serviceError = readServiceError(error);
  if (serviceError) {
    return {
      code: serviceError.code,
      ...(serviceError.details ? { details: serviceError.details } : {}),
      error,
      message: serviceError.message,
      status: serviceError.status,
    };
  }

  return null;
}

function financingConflictCode(error: Error) {
  return `CREDERE_${error.name
    .replace(/^Financing/, "")
    .replace(/Error$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase()}`;
}

function providerGatewayCode(error: FinancingProviderGatewayError) {
  if (error.kind === "rate_limited") return "CREDERE_RATE_LIMITED";
  if (error.kind === "unauthorized") return "CREDERE_UNAUTHORIZED";
  if (error.kind === "not_configured") return "CREDERE_NOT_CONFIGURED";
  if (error.kind === "invalid_response") return "CREDERE_INVALID_RESPONSE";
  if (error.kind === "indeterminate") return "CREDERE_INDETERMINATE";
  return "CREDERE_UNAVAILABLE";
}

function providerGatewayStatus(
  error: FinancingProviderGatewayError,
): 401 | 422 | 429 | 503 {
  if (error.kind === "rate_limited") return 429;
  if (error.kind === "unauthorized") return 401;
  if (error.status === 400 || error.status === 422) return 422;
  return 503;
}

export function credereFinancingErrorResponse(
  context: Context,
  error: unknown,
) {
  const common = commonApiErrorResponse(context, error);
  if (common) return common;
  return jsonApiError(context, {
    code: "INTERNAL_SERVER_ERROR",
    error,
    message: "Internal server error.",
    status: 500,
  });
}

function readServiceError(error: unknown) {
  if (!error || typeof error !== "object") return null;
  const record = error as Record<string, unknown>;
  if (
    typeof record.code !== "string" ||
    !/^(CREDERE|FINANCING)_/.test(record.code) ||
    typeof record.message !== "string" ||
    typeof record.status !== "number" ||
    !isAllowedStatus(record.status)
  ) {
    return null;
  }

  return {
    code: record.code,
    details: safeDetails(record.details, record.retryAfterSeconds),
    message: record.message,
    status: record.status,
  };
}

function isAllowedStatus(
  status: number,
): status is 400 | 401 | 403 | 409 | 422 | 429 | 503 {
  return [400, 401, 403, 409, 422, 429, 503].includes(status);
}

function safeDetails(details: unknown, retryAfterSeconds: unknown) {
  const safe: Record<string, unknown> = {};
  if (typeof retryAfterSeconds === "number") {
    safe.retryAfterSeconds = retryAfterSeconds;
  }
  if (!details || typeof details !== "object") {
    return Object.keys(safe).length ? safe : undefined;
  }
  const record = details as Record<string, unknown>;
  for (const key of [
    "field",
    "issues",
    "missingFields",
    "provider",
    "reason",
  ]) {
    if (key in record) safe[key] = record[key];
  }
  return Object.keys(safe).length ? safe : undefined;
}
