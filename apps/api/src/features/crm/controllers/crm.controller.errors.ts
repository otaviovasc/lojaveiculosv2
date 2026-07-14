import type { Context } from "hono";
import type { ApiErrorResponseInput } from "../../../infrastructure/http/apiErrorResponse.js";
import { FinanceAutoEntryEvaluationError } from "../../../domains/finance/services/FinanceService/financeAutoEntryEvaluator.js";
import {
  apiErrorInput,
  handleControllerAction,
} from "../../../infrastructure/http/commonApiErrorResponse.js";
import {
  CrmActivityIdempotencyConflictError,
  CrmLeadNotFoundError,
  CrmPipelineDuplicateNameError,
  CrmPipelineInUseError,
  CrmPipelineNotFoundError,
  CrmPipelineStageNotFoundError,
  CrmScopeError,
  CrmVisitNotFoundError,
  CrmVisitSessionMismatchError,
} from "../../../domains/crm/services/CrmService/serviceSupport.js";

export async function handleCrm(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  return handleControllerAction(context, action, crmErrorResponse);
}

function crmErrorResponse(error: unknown): ApiErrorResponseInput | null {
  if (error instanceof CrmRequestValidationError) {
    return apiErrorInput(error, "CRM_REQUEST_VALIDATION_ERROR", 400);
  }
  if (error instanceof FinanceAutoEntryEvaluationError) {
    return apiErrorInput(error, "CRM_FINANCIAL_PRODUCT_VALIDATION_ERROR", 400);
  }
  if (error instanceof CrmActivityIdempotencyConflictError) {
    return apiErrorInput(error, "CRM_ACTIVITY_IDEMPOTENCY_CONFLICT", 409);
  }
  if (error instanceof CrmLeadNotFoundError) {
    return apiErrorInput(error, "CRM_LEAD_NOT_FOUND", 404);
  }
  if (error instanceof CrmPipelineNotFoundError) {
    return apiErrorInput(error, "CRM_PIPELINE_NOT_FOUND", 404);
  }
  if (error instanceof CrmPipelineStageNotFoundError) {
    return apiErrorInput(error, "CRM_PIPELINE_STAGE_NOT_FOUND", 404);
  }
  if (error instanceof CrmPipelineDuplicateNameError) {
    return apiErrorInput(error, "CRM_PIPELINE_DUPLICATE_NAME", 409);
  }
  if (error instanceof CrmPipelineInUseError) {
    return apiErrorInput(error, "CRM_PIPELINE_IN_USE", 409);
  }
  if (error instanceof CrmVisitNotFoundError) {
    return apiErrorInput(error, "CRM_VISIT_NOT_FOUND", 404);
  }
  if (error instanceof CrmVisitSessionMismatchError) {
    return apiErrorInput(error, "CRM_VISIT_SESSION_MISMATCH", 409);
  }
  if (error instanceof CrmScopeError) {
    return apiErrorInput(error, "CRM_SCOPE_ERROR", 400);
  }
  return null;
}

export class CrmRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmRequestValidationError";
  }
}
