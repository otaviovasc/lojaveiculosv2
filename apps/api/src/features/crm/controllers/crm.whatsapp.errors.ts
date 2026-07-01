import type { Context } from "hono";
import {
  RepassesCrmAuthError,
  RepassesCrmRequestError,
  RepassesCrmUnavailableError,
} from "../../../domains/crm/acl/repassesCrmClient.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { AuthorizationError } from "../../../shared/authorization.js";

export async function handleWhatsapp(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof CrmWhatsappValidationError) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof RepassesCrmAuthError) {
      return jsonApiError(context, {
        code: "REPASSES_CRM_AUTH_ERROR",
        error,
        message: error.message,
        status: 401,
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
    if (error instanceof RepassesCrmUnavailableError) {
      return jsonApiError(context, {
        code: "REPASSES_CRM_UNAVAILABLE",
        error,
        message: error.message,
        status: 503,
      });
    }
    if (error instanceof RepassesCrmRequestError) {
      return jsonApiError(context, {
        code: "REPASSES_CRM_REQUEST_ERROR",
        error,
        message: error.message,
        status: mapUpstreamStatus(error.statusCode),
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

export class CrmWhatsappValidationError extends Error {
  constructor(message = "Request is invalid.") {
    super(message);
    this.name = "CrmWhatsappValidationError";
  }
}

type WhatsappErrorStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 502;

function mapUpstreamStatus(statusCode: number): WhatsappErrorStatus {
  switch (statusCode) {
    case 400:
    case 401:
    case 403:
    case 404:
    case 409:
    case 422:
    case 429:
      return statusCode;
    default:
      return statusCode >= 400 && statusCode < 500 ? 400 : 502;
  }
}
