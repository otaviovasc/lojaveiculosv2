import type { Context } from "hono";
import type { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { HttpContextAuthenticationError } from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ApiErrorResponseInput } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  apiErrorInput,
  handleControllerAction,
} from "../../../infrastructure/http/commonApiErrorResponse.js";
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
  return handleControllerAction(context, action, runtimeErrorResponse);
}

function runtimeErrorResponse(error: unknown): ApiErrorResponseInput | null {
  if (error instanceof ExternalRuntimeValidationError) {
    return apiErrorInput(error, "EXTERNAL_API_RUNTIME_REQUEST_ERROR", 400);
  }
  if (
    error instanceof CrmLeadNotFoundError ||
    error instanceof VehicleListingNotFoundError
  ) {
    return apiErrorInput(error, "EXTERNAL_API_RUNTIME_NOT_FOUND", 404);
  }
  if (error instanceof CrmScopeError) {
    return apiErrorInput(error, "EXTERNAL_API_RUNTIME_SCOPE_ERROR", 400);
  }
  return null;
}
