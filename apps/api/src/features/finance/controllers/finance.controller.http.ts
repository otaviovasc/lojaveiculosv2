import type { Context } from "hono";
import type { z } from "zod";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { commonApiErrorResponse } from "../../../infrastructure/http/commonApiErrorResponse.js";
import {
  FinanceEntryDocumentNotFoundError,
  FinanceEntryNotFoundError,
  FinanceRecurringEntryNotFoundError,
} from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import { FinanceAutoEntryRuleNotFoundError } from "../../../domains/finance/services/FinanceService/serviceSupport.js";
import { FinanceAutoEntryRuleValidationError } from "../../../domains/finance/services/FinanceService/financeAutoEntryRuleValidation.js";
import { FinanceAutoEntryEvaluationError } from "../../../domains/finance/services/FinanceService/financeAutoEntryEvaluator.js";
import { FinanceDocumentStorageScopeError } from "../../../domains/finance/services/FinanceService/attachFinanceEntryDocument.js";
import { FinanceDocumentStorageUnavailableError } from "../../../domains/finance/services/FinanceService/getFinanceEntryDocumentDownload.js";
import { FinanceLinkTargetNotFoundError } from "../../../infrastructure/db/finance/drizzleFinanceLinkTargets.js";
import { DocumentContentDeliveryError } from "../../documents/adapters/proxyDocumentContent.js";
import { CommissionSettlementConflictError } from "../../../domains/finance/ports/commissionWorkspaceRepository.js";
import { CommissionWorkspaceValidationError } from "../../../domains/finance/commissionWorkspaceValidation.js";
import { CommissionSettlementValidationError } from "../../../domains/finance/services/FinanceService/settleCommissionEntries.js";

export async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new FinanceRequestValidationError("Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new FinanceRequestValidationError("Request body is invalid.");
  }

  return parsed.data;
}

export async function handleFinance(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof FinanceRequestValidationError) {
      return jsonApiError(context, {
        code: "FINANCE_REQUEST_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof CommissionWorkspaceValidationError) {
      return jsonApiError(context, {
        code: "COMMISSION_WORKSPACE_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof CommissionSettlementValidationError) {
      return jsonApiError(context, {
        code: "COMMISSION_SETTLEMENT_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof CommissionSettlementConflictError) {
      return jsonApiError(context, {
        code: "COMMISSION_SETTLEMENT_CONFLICT",
        error,
        message: error.message,
        status: 409,
      });
    }

    if (
      error instanceof FinanceAutoEntryRuleValidationError ||
      error instanceof FinanceAutoEntryEvaluationError
    ) {
      return jsonApiError(context, {
        code: "FINANCE_AUTO_ENTRY_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof FinanceDocumentStorageScopeError) {
      return jsonApiError(context, {
        code: "FINANCE_STORAGE_SCOPE_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof FinanceDocumentStorageUnavailableError) {
      return jsonApiError(context, {
        code: "FINANCE_STORAGE_UNAVAILABLE",
        error,
        message: error.message,
        status: 503,
      });
    }

    if (error instanceof DocumentContentDeliveryError) {
      return jsonApiError(context, {
        code: "FINANCE_DOCUMENT_CONTENT_DELIVERY_FAILED",
        error,
        message: error.message,
        status: 502,
      });
    }

    if (error instanceof FinanceLinkTargetNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_LINK_TARGET_NOT_FOUND",
        error,
        message: error.message,
        status: 400,
      });
    }

    if (error instanceof FinanceEntryNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_ENTRY_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof FinanceEntryDocumentNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_ENTRY_DOCUMENT_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof FinanceRecurringEntryNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_RECURRING_ENTRY_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof FinanceAutoEntryRuleNotFoundError) {
      return jsonApiError(context, {
        code: "FINANCE_AUTO_ENTRY_RULE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
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

export class FinanceRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceRequestValidationError";
  }
}
