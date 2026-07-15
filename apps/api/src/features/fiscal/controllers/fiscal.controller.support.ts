import type { Context } from "hono";
import { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  FiscalDocumentNotFoundError as ScopedFiscalDocumentNotFoundError,
  FiscalProviderReferenceMissingError,
  FiscalScopeError,
} from "../../../domains/fiscal/services/FiscalService/serviceSupport.js";
import {
  FiscalDocumentNotFoundError,
  FiscalRecipientNotFoundError,
  FiscalTemplateNotFoundError,
  FiscalValidationError,
} from "../../../domains/fiscal/domain/fiscalErrors.js";
import type { FiscalContextFactory } from "./fiscal.controller.js";

export async function createUserContext(
  context: Context,
  contextFactory: FiscalContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Fiscal routes require user context.",
    );
  }
  return serviceContext;
}

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  try {
    return schema.parse(await context.req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new FiscalRequestValidationError(
        "Request body is invalid.",
        zodDetails(error),
      );
    }
    throw new FiscalRequestValidationError("Request body is invalid.");
  }
}

export async function handleFiscal(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    return handleFiscalError(context, error);
  }
}

function handleFiscalError(context: Context, error: unknown) {
  if (
    error instanceof FiscalRequestValidationError ||
    error instanceof FiscalScopeError
  ) {
    return jsonApiError(context, {
      code: "FISCAL_REQUEST_ERROR",
      error,
      message: error.message,
      status: 400,
      ...(error instanceof FiscalRequestValidationError && error.details
        ? { details: error.details }
        : {}),
    });
  }
  if (error instanceof z.ZodError) {
    return jsonApiError(context, {
      code: "FISCAL_REQUEST_ERROR",
      details: zodDetails(error),
      error,
      message: "Request query is invalid.",
      status: 400,
    });
  }
  if (error instanceof FiscalValidationError) {
    return jsonApiError(context, {
      code: "FISCAL_VALIDATION_ERROR",
      details: error.details,
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof ScopedFiscalDocumentNotFoundError) {
    return jsonApiError(context, {
      code: "FISCAL_DOCUMENT_NOT_FOUND",
      error,
      message: error.message,
      status: 404,
    });
  }
  if (
    error instanceof FiscalDocumentNotFoundError ||
    error instanceof FiscalRecipientNotFoundError ||
    error instanceof FiscalTemplateNotFoundError
  ) {
    return jsonApiError(context, {
      code: "FISCAL_NOT_FOUND",
      error,
      message: error.message,
      status: 404,
    });
  }
  if (error instanceof FiscalProviderReferenceMissingError) {
    return jsonApiError(context, {
      code: "FISCAL_PROVIDER_REFERENCE_MISSING",
      error,
      message: error.message,
      status: 409,
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
  if (isFiscalProviderRuntimeError(error)) {
    return jsonApiError(context, {
      code: "FISCAL_PROVIDER_UNAVAILABLE",
      error,
      message: error.message,
      status: 503,
    });
  }
  return jsonApiError(context, {
    code: "INTERNAL_SERVER_ERROR",
    error,
    message: "Internal server error.",
    status: 500,
  });
}

function isFiscalProviderRuntimeError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.name === "SpedyGatewayConfigurationError" ||
      error.name === "SpedyGatewayHttpError")
  );
}

class FiscalRequestValidationError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "FiscalRequestValidationError";
  }
}

function zodDetails(error: z.ZodError): Record<string, unknown> {
  return {
    issues: error.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: issue.path.join("."),
    })),
  };
}
