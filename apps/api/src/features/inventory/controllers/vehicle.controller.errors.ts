import type { Context } from "hono";
import {
  BillingContractUnavailableError,
  BillingQuotaExceededError,
} from "../../../domains/billing/ports/billingQuotaGuard.js";
import { SaleUnitConflictError } from "../../../domains/sales/saleUnitConflict.js";
import {
  VehicleChecklistNotFoundError,
  VehicleChecklistValidationError,
} from "../../../domains/vehicle/checklists/vehicleChecklistSupport.js";
import { VehicleWorkflowStatusError } from "../../../domains/vehicle/policies/workflowStatusPolicy.js";
import { VehicleDocumentStorageScopeError } from "../../../domains/vehicle/services/VehicleService/attachVehicleDocument.js";
import { VehicleMediaStorageScopeError } from "../../../domains/vehicle/services/VehicleService/createVehicleMedia.js";
import { VehicleAiStudioStorageScopeError } from "../../../domains/vehicle/services/VehicleService/approveVehicleAiStudioImage.js";
import { VehicleAiStudioValidationError } from "../../../domains/vehicle/services/VehicleService/generateVehicleAiStudioImage.js";
import { VehicleAiStudioProviderError } from "../../../domains/vehicle/ports/vehicleAiStudioProvider.js";
import { VehicleListingDeletionStateError } from "../../../domains/vehicle/services/VehicleService/deleteVehicleListing.js";
import { VehiclePublicationValidationError } from "../../../domains/vehicle/services/VehicleService/publishVehicleListing.js";
import {
  VehicleListingNotFoundError,
  VehicleMediaNotFoundError,
  VehicleSupplierNotFoundError,
  VehicleUnitNotFoundError,
} from "../../../domains/vehicle/services/VehicleService/serviceSupport.js";
import {
  VehicleWorkflowStateError,
  VehicleWorkflowValidationError,
} from "../../../domains/vehicle/workflows/vehicleSaleWorkflowRules.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { createVehicleAiStudioProviderPublicDetails } from "./vehicle.aiStudio.errors.js";
import { VehicleMediaContentDeliveryError } from "../adapters/proxyVehicleMediaContent.js";

export function mapInventoryWorkflowError(
  context: Context,
  error: unknown,
): Response | null {
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
    error instanceof VehicleAiStudioValidationError ||
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

  if (error instanceof BillingQuotaExceededError) {
    return jsonApiError(context, {
      code: "BILLING_QUOTA_EXCEEDED",
      details: {
        current: error.current,
        limit: error.limit,
        quotaKey: error.quotaKey,
      },
      error,
      message: error.message,
      status: 409,
    });
  }

  if (error instanceof BillingContractUnavailableError) {
    return jsonApiError(context, {
      code: "BILLING_CONTRACT_REQUIRED",
      error,
      message: error.message,
      status: 402,
    });
  }

  return null;
}

export function mapInventoryResourceError(
  context: Context,
  error: unknown,
): Response | null {
  if (error instanceof VehicleMediaContentDeliveryError) {
    return jsonApiError(context, {
      code: "VEHICLE_MEDIA_CONTENT_UNAVAILABLE",
      error,
      message: error.message,
      status: error.statusCode,
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
    error instanceof VehicleMediaStorageScopeError ||
    error instanceof VehicleAiStudioStorageScopeError
  ) {
    return jsonApiError(context, {
      code: "INVENTORY_STORAGE_SCOPE_ERROR",
      error,
      message: error.message,
      status: 400,
    });
  }

  return null;
}

export function mapInventoryAiStudioProviderError(
  context: Context,
  error: unknown,
): Response | null {
  if (!(error instanceof VehicleAiStudioProviderError)) return null;

  const details = createVehicleAiStudioProviderPublicDetails(error);
  return jsonApiError(context, {
    code: "VEHICLE_AI_STUDIO_PROVIDER_ERROR",
    ...(details ? { details } : {}),
    error,
    message: error.message,
    status: error.statusCode,
  });
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
