import type { Context } from "hono";
import type { z } from "zod";
import {
  PublicStorefrontListingNotFoundError,
  PublicStorefrontNotFoundError,
  PublicStorefrontRepositoryError,
  StorefrontPageNotFoundError,
  StorefrontPageRepositoryError,
} from "../../../domains/storefront/services/StorefrontService/serviceSupport.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import { StorefrontRequestValidationError } from "./storefrontErrors.js";

export function rejectMissingStoreSlug(context: Context) {
  return jsonApiError(context, {
    code: "STOREFRONT_STORE_SLUG_REQUIRED",
    message: "Store subdomain is required.",
    status: 400,
  });
}

export function rejectInvalidStorefrontQuery(
  context: Context,
  error: z.ZodError,
) {
  return jsonApiError(context, {
    code: "STOREFRONT_QUERY_VALIDATION_ERROR",
    details: { issues: error.issues },
    message: "Query parameters are invalid.",
    status: 400,
  });
}

export async function handleStorefront(
  context: Context,
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }
    if (error instanceof StorefrontRequestValidationError) {
      return jsonApiError(context, {
        code: "STOREFRONT_REQUEST_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof PublicStorefrontNotFoundError) {
      return jsonApiError(context, {
        code: "PUBLIC_STOREFRONT_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (error instanceof PublicStorefrontListingNotFoundError) {
      return jsonApiError(context, {
        code: "PUBLIC_STOREFRONT_LISTING_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
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
    if (error instanceof PublicStorefrontRepositoryError) {
      return jsonApiError(context, {
        code: "PUBLIC_STOREFRONT_REPOSITORY_ERROR",
        error,
        message: error.message,
        status: 500,
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
