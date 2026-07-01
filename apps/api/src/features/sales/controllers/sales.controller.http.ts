import type { Context } from "hono";
import type { z } from "zod";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  SaleNotFoundError,
  SaleReadinessError,
  SaleReferenceError,
  SaleTransitionStateError,
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
      return jsonApiError(context, {
        code: "SALES_REQUEST_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof SaleReadinessError) {
      return jsonApiError(context, {
        code: "SALE_READINESS_ERROR",
        details: { missingFields: error.missingFields },
        error,
        message: error.message,
        status: 409,
      });
    }
    if (error instanceof SaleTransitionStateError) {
      return context.json(
        {
          currentStatus: error.currentStatus,
          message: error.message,
          nextStatus: error.nextStatus,
        },
        409,
      );
    }
    if (error instanceof SaleReferenceError) {
      return context.json(
        { message: error.message, reference: error.reference },
        409,
      );
    }
    if (error instanceof SaleNotFoundError) {
      return jsonApiError(context, {
        code: "SALE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (
      error instanceof VehicleListingNotFoundError ||
      error instanceof VehicleUnitNotFoundError
    ) {
      return jsonApiError(context, {
        code: "SALES_VEHICLE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (error instanceof VehicleWorkflowValidationError) {
      return jsonApiError(context, {
        code: "VEHICLE_WORKFLOW_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof VehicleWorkflowStateError) {
      return jsonApiError(context, {
        code: "VEHICLE_WORKFLOW_CONFLICT",
        error,
        message: error.message,
        status: 409,
      });
    }
    if (error instanceof AuthorizationError) {
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
    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}

export class SalesRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesRequestValidationError";
  }
}
