import type { Context } from "hono";
import type { ApiErrorResponseInput } from "../../../infrastructure/http/apiErrorResponse.js";
import {
  apiErrorInput,
  handleControllerAction,
} from "../../../infrastructure/http/commonApiErrorResponse.js";
import {
  CrmCoreNotFoundError,
  CrmCoreRevisionConflictError,
  CrmCoreRuleError,
} from "../../../domains/crm/core/errors.js";
import { CrmRequestValidationError } from "./crm.controller.errors.js";

export function handleCrmCore(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  return handleControllerAction(context, action, crmCoreErrorResponse);
}

function crmCoreErrorResponse(error: unknown): ApiErrorResponseInput | null {
  if (error instanceof CrmRequestValidationError) {
    return apiErrorInput(error, "CRM_CORE_REQUEST_INVALID", 400);
  }
  if (error instanceof CrmCoreNotFoundError) {
    return apiErrorInput(error, "CRM_CORE_NOT_FOUND", 404);
  }
  if (error instanceof CrmCoreRevisionConflictError) {
    return apiErrorInput(error, "CRM_CORE_REVISION_CONFLICT", 409);
  }
  if (error instanceof CrmCoreRuleError) {
    return apiErrorInput(error, error.code, 409);
  }
  return null;
}
