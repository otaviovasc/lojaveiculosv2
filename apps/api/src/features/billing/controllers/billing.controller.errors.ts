import type { Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  BillingCompositionError,
  BillingScopeError,
  BillingStoreNotFoundError,
} from "../../../domains/billing/services/BillingService/serviceSupport.js";
import {
  BillingWebhookAuthenticationError,
  BillingWebhookValidationError,
} from "../../../domains/billing/readModels/billingWebhookErrors.js";
import { BillingWebhookRateLimiterUnavailableError } from "../../../domains/billing/ports/billingWebhookRateLimiter.js";
import {
  BillingWebhookPayloadTooLargeError,
  BillingWebhookRateLimitedError,
  BillingWebhookStructureError,
} from "./billingWebhookHttpSecurity.js";
import { BillingProviderSyncError } from "../../../domains/billing/services/BillingService/syncBillingProviderSubscription.js";
import { BillingPlanHireRepositoryError } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { BillingPlanHireError } from "../../../domains/billing/services/BillingService/createBillingPlanHire.js";

export class BillingRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingRequestValidationError";
  }
}

export async function handleBilling(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof BillingCompositionError) {
      return jsonApiError(context, {
        code: "BILLING_SERVICE_UNAVAILABLE",
        error,
        message: error.message,
        status: 503,
      });
    }
    if (error instanceof BillingStoreNotFoundError) {
      return jsonApiError(context, {
        code: "BILLING_STORE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (
      error instanceof BillingRequestValidationError ||
      error instanceof BillingWebhookValidationError ||
      error instanceof BillingScopeError
    ) {
      return jsonApiError(context, {
        code: "BILLING_REQUEST_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof BillingWebhookPayloadTooLargeError) {
      return jsonApiError(context, {
        code: "BILLING_WEBHOOK_PAYLOAD_TOO_LARGE",
        error,
        message: error.message,
        status: 413,
      });
    }
    if (error instanceof BillingWebhookStructureError) {
      return jsonApiError(context, {
        code: "BILLING_WEBHOOK_INVALID",
        error,
        message: error.message,
        status: 422,
      });
    }
    if (error instanceof BillingWebhookRateLimitedError) {
      context.header("Retry-After", String(error.retryAfterSeconds));
      return jsonApiError(context, {
        code: "BILLING_WEBHOOK_RATE_LIMITED",
        details: { retryAfterSeconds: error.retryAfterSeconds },
        error,
        message: error.message,
        status: 429,
      });
    }
    if (error instanceof BillingWebhookRateLimiterUnavailableError) {
      return jsonApiError(context, {
        code: "BILLING_WEBHOOK_SECURITY_UNAVAILABLE",
        error,
        message: "Billing webhook security is unavailable.",
        status: 503,
      });
    }
    if (
      error instanceof BillingPlanHireError ||
      error instanceof BillingPlanHireRepositoryError
    ) {
      return jsonApiError(context, {
        code: error.code,
        error,
        message: error.message,
        status:
          error.code === "BILLING_PLAN_HIRE_NOT_FOUND"
            ? 404
            : error.code === "BILLING_PROVIDER_UNAVAILABLE"
              ? 503
              : error.code === "hire_in_progress"
                ? 409
                : 400,
      });
    }
    if (error instanceof BillingWebhookAuthenticationError) {
      return jsonApiError(context, {
        code: "BILLING_WEBHOOK_AUTHENTICATION_FAILED",
        error,
        message: error.message,
        status: 401,
      });
    }
    if (error instanceof BillingProviderSyncError) {
      return jsonApiError(context, {
        code: "BILLING_PROVIDER_SYNC_FAILED",
        details: { reason: error.reason },
        error,
        message: error.message,
        status: syncErrorStatus(error.status),
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
}

function syncErrorStatus(status: number): 400 | 404 | 409 | 502 | 503 {
  if (status === 400 || status === 404 || status === 409 || status === 503) {
    return status;
  }
  return 502;
}
