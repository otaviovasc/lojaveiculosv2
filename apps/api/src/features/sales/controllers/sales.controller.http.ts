import type { Context } from "hono";
import type { z } from "zod";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { commonApiErrorResponse } from "../../../infrastructure/http/commonApiErrorResponse.js";
import {
  VehicleListingNotFoundError,
  VehicleUnitNotFoundError,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "../../../domains/vehicle/workflows/vehicleSaleWorkflowRules.js";
import { mapSalesDomainError } from "./sales.controller.salesErrors.js";

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
    const salesDomainResponse = mapSalesDomainError(context, error);
    if (salesDomainResponse) return salesDomainResponse;
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
    const commonResponse = commonApiErrorResponse(context, error);
    if (commonResponse) return commonResponse;
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
