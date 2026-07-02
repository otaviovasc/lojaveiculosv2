import type { Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  StorefrontMediaRepositoryError,
  StorefrontMediaStorageError,
  StorefrontMediaValidationError,
  StorefrontPageScopeError,
} from "../../../domains/storefront/services/StorefrontService/serviceSupport.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";

export async function handleStorefrontMedia(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof StorefrontMediaRequestValidationError ||
      error instanceof StorefrontMediaValidationError ||
      error instanceof StorefrontPageScopeError
    ) {
      return jsonApiError(context, {
        code: "STOREFRONT_MEDIA_REQUEST_ERROR",
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
    if (
      error instanceof StorefrontMediaRepositoryError ||
      error instanceof StorefrontMediaStorageError
    ) {
      return jsonApiError(context, {
        code: "STOREFRONT_MEDIA_CONFIGURATION_ERROR",
        error,
        message: error.message,
        status: 500,
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

export class StorefrontMediaRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorefrontMediaRequestValidationError";
  }
}
