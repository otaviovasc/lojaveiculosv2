import type { Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  AutomationApprovalNotFoundError,
  AutomationInputError,
  AutomationInvalidTransitionError,
  AutomationRunNotFoundError,
  AutomationStaleApprovalError,
  AutomationStaleVersionError,
  AutomationStepNotFoundError,
} from "../../../domains/automation/errors.js";
import { AutomationScopeError } from "../../../domains/automation/services/AutomationService/serviceSupport.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";

export class AutomationRequestValidationError extends Error {
  readonly details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AutomationRequestValidationError";
    if (details) this.details = details;
  }
}

export function automationErrorResponse(context: Context, error: unknown) {
  if (error instanceof AutomationRequestValidationError) {
    return jsonApiError(context, {
      code: "AUTOMATION_REQUEST_VALIDATION_FAILED",
      ...(error.details ? { details: error.details } : {}),
      error,
      message: error.message,
      status: 400,
    });
  }
  if (
    error instanceof AutomationInputError ||
    error instanceof AutomationScopeError
  ) {
    return jsonApiError(context, {
      code: "AUTOMATION_REQUEST_VALIDATION_FAILED",
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof AutomationRunNotFoundError) {
    return notFound(context, error, "AUTOMATION_RUN_NOT_FOUND");
  }
  if (error instanceof AutomationStepNotFoundError) {
    return notFound(context, error, "AUTOMATION_STEP_NOT_FOUND");
  }
  if (error instanceof AutomationApprovalNotFoundError) {
    return notFound(context, error, "AUTOMATION_APPROVAL_NOT_FOUND");
  }
  if (error instanceof AutomationStaleApprovalError) {
    return conflict(context, error, "AUTOMATION_STALE_APPROVAL");
  }
  if (error instanceof AutomationStaleVersionError) {
    return conflict(context, error, "AUTOMATION_STALE_VERSION");
  }
  if (error instanceof AutomationInvalidTransitionError) {
    return conflict(context, error, "AUTOMATION_INVALID_TRANSITION");
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

function notFound(context: Context, error: Error, code: string) {
  return jsonApiError(context, {
    code,
    error,
    message: error.message,
    status: 404,
  });
}

function conflict(context: Context, error: Error, code: string) {
  return jsonApiError(context, {
    code,
    error,
    message: error.message,
    status: 409,
  });
}
