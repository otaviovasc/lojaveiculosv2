import type { Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  DocumentOperationNotFoundError,
  DocumentOperationPolicyError,
  DocumentOperationStorageError,
} from "../../../domains/documents/services/DocumentOperationService/serviceSupport.js";

export async function handleDocuments(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof DocumentsRequestValidationError) {
      return jsonApiError(context, {
        code: "DOCUMENTS_REQUEST_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
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

    if (error instanceof HttpContextAuthenticationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHENTICATION_REQUIRED",
        error,
        message: error.message,
        status: 401,
      });
    }

    if (error instanceof HttpContextRequestPolicyError) {
      return jsonApiError(context, {
        code: "HTTP_REQUEST_POLICY_ERROR",
        error,
        message: error.message,
        status: error.statusCode,
      });
    }

    if (error instanceof DocumentOperationStorageError) {
      return jsonApiError(context, {
        code: "DOCUMENT_STORAGE_UNAVAILABLE",
        error,
        message: error.message,
        status: 503,
      });
    }

    if (error instanceof DocumentOperationNotFoundError) {
      return jsonApiError(context, {
        code: "DOCUMENT_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof DocumentOperationPolicyError) {
      return jsonApiError(context, {
        code: "DOCUMENT_POLICY_ERROR",
        error,
        message: error.message,
        status: 409,
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

export class DocumentsRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentsRequestValidationError";
  }
}
