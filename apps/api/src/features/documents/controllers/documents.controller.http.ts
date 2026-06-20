import type { Context } from "hono";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
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
      return context.json({ message: error.message }, 400);
    }

    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return context.json({ message: error.message }, 403);
    }

    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }

    if (error instanceof HttpContextRequestPolicyError) {
      return context.json({ message: error.message }, error.statusCode);
    }

    if (error instanceof DocumentOperationStorageError) {
      return context.json({ message: error.message }, 503);
    }

    if (error instanceof DocumentOperationNotFoundError) {
      return context.json({ message: error.message }, 404);
    }

    if (error instanceof DocumentOperationPolicyError) {
      return context.json({ message: error.message }, 409);
    }

    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

export class DocumentsRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentsRequestValidationError";
  }
}
