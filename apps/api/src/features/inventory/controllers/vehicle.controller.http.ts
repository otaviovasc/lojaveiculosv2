import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { VehicleMediaStorageScopeError } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import { VehicleDocumentStorageScopeError } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import {
  VehicleListingNotFoundError,
  VehicleMediaNotFoundError,
  VehicleUnitNotFoundError,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import { VehicleWorkflowStatusError } from "../../../domains/vehicle/policies/workflowStatusPolicy.js";

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
    throw new RequestValidationError("Request body is invalid.");
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
      return context.json({ message: error.message }, 400);
    }

    if (error instanceof VehicleWorkflowStatusError) {
      return context.json({ message: error.message }, 400);
    }

    if (error instanceof AuthorizationError) {
      return context.json({ message: error.message }, 403);
    }

    if (isVehicleInventoryNotFoundError(error)) {
      return context.json({ message: error.message }, 404);
    }

    if (
      error instanceof VehicleDocumentStorageScopeError ||
      error instanceof VehicleMediaStorageScopeError
    ) {
      return context.json({ message: error.message }, 400);
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

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

function isVehicleInventoryNotFoundError(
  error: unknown,
): error is
  | VehicleListingNotFoundError
  | VehicleMediaNotFoundError
  | VehicleUnitNotFoundError {
  return (
    error instanceof VehicleListingNotFoundError ||
    error instanceof VehicleMediaNotFoundError ||
    error instanceof VehicleUnitNotFoundError ||
    (error instanceof Error &&
      [
        "VehicleListingNotFoundError",
        "VehicleMediaNotFoundError",
        "VehicleUnitNotFoundError",
      ].includes(error.name))
  );
}
