import type { Context } from "hono";
import {
  HttpContextAuthenticationError,
  HttpContextAuthorizationError,
  HttpContextRequestPolicyError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AuthorizationError } from "../../../shared/authorization.js";
import {
  CrmLeadNotFoundError,
  CrmPipelineDuplicateNameError,
  CrmPipelineInUseError,
  CrmPipelineNotFoundError,
  CrmPipelineStageNotFoundError,
  CrmScopeError,
} from "../../../domains/crm/services/CrmService/serviceSupport.js";

export async function handleCrm(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof CrmRequestValidationError) {
      return jsonApiError(context, {
        code: "CRM_REQUEST_VALIDATION_ERROR",
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

    if (
      error instanceof AuthorizationError ||
      error instanceof HttpContextAuthorizationError
    ) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
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

    if (error instanceof CrmLeadNotFoundError) {
      return jsonApiError(context, {
        code: "CRM_LEAD_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof CrmPipelineNotFoundError) {
      return jsonApiError(context, {
        code: "CRM_PIPELINE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof CrmPipelineStageNotFoundError) {
      return jsonApiError(context, {
        code: "CRM_PIPELINE_STAGE_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }

    if (error instanceof CrmPipelineDuplicateNameError) {
      return jsonApiError(context, {
        code: "CRM_PIPELINE_DUPLICATE_NAME",
        error,
        message: error.message,
        status: 409,
      });
    }

    if (error instanceof CrmPipelineInUseError) {
      return jsonApiError(context, {
        code: "CRM_PIPELINE_IN_USE",
        error,
        message: error.message,
        status: 409,
      });
    }

    if (error instanceof CrmScopeError) {
      return jsonApiError(context, {
        code: "CRM_SCOPE_ERROR",
        error,
        message: error.message,
        status: 400,
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

export class CrmRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmRequestValidationError";
  }
}
