import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import {
  SaleNotFoundError,
  SaleReadinessError,
} from "../../../domains/sales/services/SalesService/serviceSupport.js";
import {
  VehicleListingNotFoundError,
  VehicleUnitNotFoundError,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "../../../domains/vehicle/workflows/vehicleSaleWorkflowRules.js";

export async function parseSalesJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new SalesRequestValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new SalesRequestValidationError("Request body is invalid.");
  }
  return parsed.data;
}

export async function handleSales(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof SalesRequestValidationError) {
      return context.json({ message: error.message }, 400);
    }
    if (error instanceof SaleReadinessError) {
      return context.json(
        { message: error.message, missingFields: error.missingFields },
        409,
      );
    }
    if (error instanceof SaleNotFoundError) {
      return context.json({ message: error.message }, 404);
    }
    if (
      error instanceof VehicleListingNotFoundError ||
      error instanceof VehicleUnitNotFoundError
    ) {
      return context.json({ message: error.message }, 404);
    }
    if (error instanceof VehicleWorkflowValidationError) {
      return context.json({ message: error.message }, 400);
    }
    if (error instanceof VehicleWorkflowStateError) {
      return context.json({ message: error.message }, 409);
    }
    if (error instanceof AuthorizationError) {
      return context.json({ message: error.message }, 403);
    }
    if (error instanceof HttpContextAuthenticationError) {
      return context.json({ message: error.message }, 401);
    }
    if (error instanceof HttpContextAuthorizationError) {
      return context.json({ message: error.message }, 403);
    }
    if (error instanceof HttpContextRequestPolicyError) {
      return context.json({ message: error.message }, error.statusCode);
    }
    context.error = error instanceof Error ? error : new Error(String(error));
    return context.json({ message: "Internal server error." }, 500);
  }
}

export class SalesRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesRequestValidationError";
  }
}
