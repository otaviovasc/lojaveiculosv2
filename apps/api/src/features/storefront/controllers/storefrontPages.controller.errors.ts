import type { Context } from "hono";
import {
  StorefrontPageNotFoundError,
  StorefrontPageRepositoryError,
  StorefrontPageScopeError,
} from "../../../domains/storefront/services/StorefrontService/serviceSupport.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AuthorizationError } from "../../../shared/authorization.js";

export async function handleStorefrontPages(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (
      error instanceof StorefrontPagesRequestValidationError ||
      error instanceof StorefrontPageScopeError
    ) {
      return jsonApiError(context, {
        code: "STOREFRONT_PAGES_REQUEST_ERROR",
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
    if (error instanceof StorefrontPageNotFoundError) {
      return jsonApiError(context, {
        code: "STOREFRONT_PAGE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (error instanceof StorefrontPageRepositoryError) {
      return jsonApiError(context, {
        code: "STOREFRONT_PAGE_REPOSITORY_ERROR",
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

export class StorefrontPagesRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorefrontPagesRequestValidationError";
  }
}
