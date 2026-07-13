import type { Context } from "hono";
import type { z } from "zod";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { VehicleMediaStorageScopeError } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import { VehicleDocumentStorageScopeError } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import { VehiclePublicationValidationError } from "../../../domains/vehicle/services/VehicleService/publishVehicleListing.js";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "../../../domains/vehicle/workflows/vehicleSaleWorkflowRules.js";
import {
  VehicleListingNotFoundError,
  VehicleMediaNotFoundError,
  VehicleSupplierNotFoundError,
  VehicleUnitNotFoundError,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  VehicleChecklistNotFoundError,
  VehicleChecklistValidationError,
} from "../../../domains/vehicle/checklists/vehicleChecklistSupport.js";
import { VehicleWorkflowStatusError } from "../../../domains/vehicle/policies/workflowStatusPolicy.js";
import { VehicleListingDeletionStateError } from "../../../domains/vehicle/services/VehicleService/deleteVehicleListing.js";
import { SaleUnitConflictError } from "../../../domains/sales/saleUnitConflict.js";

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

    if (error instanceof VehicleWorkflowStatusError) {
      return jsonApiError(context, {
        code: "VEHICLE_WORKFLOW_STATUS_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (
      error instanceof VehicleWorkflowValidationError ||
      error instanceof VehicleChecklistValidationError ||
      error instanceof VehiclePublicationValidationError
    ) {
      return jsonApiError(context, {
        code: "VEHICLE_VALIDATION_ERROR",
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

    if (error instanceof SaleUnitConflictError) {
      return jsonApiError(context, {
        code: "SALE_UNIT_CONFLICT",
        error,
        message: error.message,
        status: 409,
      });
    }

    if (error instanceof VehicleListingDeletionStateError) {
      return jsonApiError(context, {
        code: "VEHICLE_DELETE_CONFLICT",
        details: { blockingStatuses: error.blockingStatuses },
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

    if (isVehicleInventoryNotFoundError(error)) {
      return jsonApiError(context, {
        code: "INVENTORY_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (
      error instanceof VehicleDocumentStorageScopeError ||
      error instanceof VehicleMediaStorageScopeError
    ) {
      return jsonApiError(context, {
        code: "INVENTORY_STORAGE_SCOPE_ERROR",
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

function isVehicleInventoryNotFoundError(
  error: unknown,
): error is
  | VehicleListingNotFoundError
  | VehicleChecklistNotFoundError
  | VehicleMediaNotFoundError
  | VehicleSupplierNotFoundError
  | VehicleUnitNotFoundError {
  return (
    error instanceof VehicleListingNotFoundError ||
    error instanceof VehicleChecklistNotFoundError ||
    error instanceof VehicleMediaNotFoundError ||
    error instanceof VehicleSupplierNotFoundError ||
    error instanceof VehicleUnitNotFoundError ||
    (error instanceof Error &&
      [
        "VehicleListingNotFoundError",
        "VehicleChecklistNotFoundError",
        "VehicleMediaNotFoundError",
        "VehicleSupplierNotFoundError",
        "VehicleUnitNotFoundError",
      ].includes(error.name))
  );
}
