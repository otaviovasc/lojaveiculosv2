import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  CrmLeadNotFoundError,
  CrmScopeError,
} from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { VehicleListingNotFoundError } from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import { ExternalRuntimeValidationError } from "./externalApiRuntime.support.js";

export type RuntimeContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export async function createIntegrationContext(
  context: Context,
  contextFactory: RuntimeContextFactory,
) {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "integration") {
    throw new HttpContextAuthenticationError(
      "External API runtime routes require a scoped API key.",
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
  } catch {
    throw new ExternalRuntimeValidationError("Request body is invalid.");
  }
}

export function parseQuery<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): z.infer<Schema> {
  const parsed = schema.safeParse(context.req.query());
  if (!parsed.success) {
    throw new ExternalRuntimeValidationError("Request query is invalid.");
  }
  return parsed.data;
}

export async function handleRuntime(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ExternalRuntimeValidationError) {
      return jsonApiError(context, {
        code: "EXTERNAL_API_RUNTIME_REQUEST_ERROR",
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
    if (error instanceof HttpContextRequestPolicyError) {
      return jsonApiError(context, {
        code: "HTTP_REQUEST_POLICY_ERROR",
        error,
        message: error.message,
        status: error.statusCode,
      });
    }
    if (
      error instanceof CrmLeadNotFoundError ||
      error instanceof VehicleListingNotFoundError
    ) {
      return jsonApiError(context, {
        code: "EXTERNAL_API_RUNTIME_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (error instanceof CrmScopeError) {
      return jsonApiError(context, {
        code: "EXTERNAL_API_RUNTIME_SCOPE_ERROR",
        error,
        message: error.message,
        status: 400,
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
