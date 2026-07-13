import type { Context } from "hono";
import {
  SaleDraftDeletionStateError,
  SaleDraftUpdateConflictError,
  SaleDraftUpdateStateError,
  SaleNotFoundError,
  SalePaymentAmountError,
  SalePaymentIdentityError,
  SalePendingUnitChangeError,
  SaleReadinessError,
  SaleReferenceError,
  SaleReversionCompensationError,
  SaleReversionConflictError,
  SaleReversionReasonError,
  SaleReversionStateError,
  SaleReversionUnsupportedError,
  SaleTransitionStateError,
  SaleTransitionConflictError,
} from "../../../domains/sales/services/SalesService/serviceSupport.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";

export function mapSalesDomainError(
  context: Context,
  error: unknown,
): Response | null {
  if (error instanceof SaleReadinessError) {
    return conflict(context, error, "SALE_READINESS_ERROR", {
      missingFields: error.missingFields,
    });
  }
  if (error instanceof SaleTransitionStateError) {
    return conflict(context, error, "SALE_TRANSITION_STATE_ERROR", {
      currentStatus: error.currentStatus,
      nextStatus: error.nextStatus,
    });
  }
  if (error instanceof SaleTransitionConflictError) {
    return conflict(context, error, "SALE_TRANSITION_CONFLICT");
  }
  if (error instanceof SaleDraftDeletionStateError) {
    return conflict(context, error, "SALE_DRAFT_DELETE_STATE_ERROR", {
      currentStatus: error.currentStatus,
    });
  }
  if (error instanceof SaleDraftUpdateStateError) {
    return conflict(context, error, "SALE_DRAFT_UPDATE_STATE_ERROR", {
      currentStatus: error.currentStatus,
    });
  }
  if (error instanceof SaleDraftUpdateConflictError) {
    return conflict(context, error, "SALE_DRAFT_UPDATE_CONFLICT");
  }
  if (error instanceof SalePaymentIdentityError) {
    return conflict(context, error, "SALE_PAYMENT_IDENTITY_ERROR", {
      paymentId: error.paymentId,
      reason: error.reason,
    });
  }
  if (error instanceof SalePaymentAmountError) {
    return jsonApiError(context, {
      code: "SALE_PAYMENT_AMOUNT_INVALID",
      details: { paymentIndex: error.paymentIndex },
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof SalePendingUnitChangeError) {
    return conflict(context, error, "SALE_PENDING_UNIT_CHANGE_ERROR");
  }
  if (error instanceof SaleReferenceError) {
    return conflict(context, error, "SALE_REFERENCE_ERROR", {
      reference: error.reference,
    });
  }
  if (error instanceof SaleReversionReasonError) {
    return jsonApiError(context, {
      code: "SALE_REVERSION_REASON_REQUIRED",
      error,
      message: error.message,
      status: 400,
    });
  }
  if (error instanceof SaleReversionStateError) {
    return conflict(context, error, "SALE_REVERSION_STATE_ERROR", {
      currentStatus: error.currentStatus,
      isCurrentRevision: error.isCurrentRevision,
    });
  }
  if (error instanceof SaleReversionUnsupportedError) {
    return conflict(context, error, "SALE_REVERSION_UNSUPPORTED_ACQUISITION", {
      unsupportedReason: error.unsupportedReason,
    });
  }
  if (error instanceof SaleReversionCompensationError) {
    return conflict(context, error, "SALE_REVERSION_COMPENSATION_ERROR", {
      compensation: error.compensation,
    });
  }
  if (error instanceof SaleReversionConflictError) {
    return conflict(context, error, "SALE_REVERSION_CONFLICT");
  }
  if (error instanceof SaleNotFoundError) {
    return jsonApiError(context, {
      code: "SALE_NOT_FOUND",
      error,
      message: error.message,
      status: 404,
    });
  }
  return null;
}

function conflict(
  context: Context,
  error: Error,
  code: string,
  details?: Record<string, unknown>,
): Response {
  return jsonApiError(context, {
    code,
    ...(details ? { details } : {}),
    error,
    message: error.message,
    status: 409,
  });
}
