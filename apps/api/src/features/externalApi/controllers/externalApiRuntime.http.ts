import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
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
      return context.json({ message: error.message }, 400);
    }
    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }
    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return context.json({ message: error.message }, 403);
    }
    if (error instanceof HttpContextRequestPolicyError) {
      return context.json({ message: error.message }, error.statusCode);
    }
    if (
      error instanceof CrmLeadNotFoundError ||
      error instanceof VehicleListingNotFoundError
    ) {
      return context.json({ message: error.message }, 404);
    }
    if (error instanceof CrmScopeError) {
      return context.json({ message: error.message }, 400);
    }
    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}
