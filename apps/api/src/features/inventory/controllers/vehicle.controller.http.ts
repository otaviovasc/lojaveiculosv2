import type { Context } from "hono";
import type { z } from "zod";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  mapInventoryAiStudioProviderError,
  mapInventoryResourceError,
  mapInventoryWorkflowError,
} from "./vehicle.controller.errors.js";

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new RequestValidationError("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new RequestValidationError("Request body is invalid.", {
      fields: parsed.error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.join("."),
      })),
    });
  }

  return parsed.data;
}

export async function handle(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return jsonApiError(context, {
        code: "REQUEST_VALIDATION_ERROR",
        ...(error.details ? { details: error.details } : {}),
        error,
        message: error.message,
        status: 400,
      });
    }

    const workflowErrorResponse = mapInventoryWorkflowError(context, error);
    if (workflowErrorResponse) return workflowErrorResponse;

    if (error instanceof AuthorizationError) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }
    const resourceErrorResponse = mapInventoryResourceError(context, error);
    if (resourceErrorResponse) return resourceErrorResponse;

    if (error instanceof HttpContextAuthenticationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHENTICATION_REQUIRED",
        error,
        message: error.message,
        status: 401,
      });
    }

    if (error instanceof HttpContextAuthorizationError) {
      return jsonApiError(context, {
        code: "HTTP_AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
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

    const aiStudioProviderErrorResponse = mapInventoryAiStudioProviderError(
      context,
      error,
    );
    if (aiStudioProviderErrorResponse) return aiStudioProviderErrorResponse;

    const providerStatusCode = readProviderStatusCode(error);
    if (providerStatusCode) {
      return jsonApiError(context, {
        code: "INVENTORY_ENRICHMENT_PROVIDER_ERROR",
        error,
        message: error instanceof Error ? error.message : "Provider error.",
        status: providerStatusCode,
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

function readProviderStatusCode(error: unknown): 502 | 503 | null {
  if (!(error instanceof Error)) return null;
  const statusCode = (error as Error & { statusCode?: unknown }).statusCode;
  if (
    error.name === "InventoryEnrichmentProviderError" &&
    (statusCode === 502 || statusCode === 503)
  ) {
    return statusCode;
  }
  return null;
}

export class RequestValidationError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RequestValidationError";
  }
}
