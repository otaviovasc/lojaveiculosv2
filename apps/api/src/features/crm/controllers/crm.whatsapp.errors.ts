import type { Context } from "hono";
import { CrmLeadNotFoundError } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { CrmWhatsappGatewayError } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import {
  WhatsappBotActionError,
  WhatsappBotIntegrationIncompleteError,
  WhatsappBotIntegrationUnauthorizedError,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappBotIntegration.js";
import { WhatsappQuickMessageError } from "../../../domains/crm/services/CrmWhatsapp/whatsappQuickMessageServiceSupport.js";
import { WhatsappWebhookEventRetryError } from "../../../domains/crm/services/CrmWhatsapp/whatsappWebhookEvents.js";
import {
  WhatsappConnectionNotFoundError,
  WhatsappCampaignNotFoundError,
  WhatsappMessageActionError,
  WhatsappMessageNotFoundError,
  WhatsappScheduledMessageNotFoundError,
  WhatsappSessionNotFoundError,
  WhatsappTagNotFoundError,
} from "../../../domains/crm/whatsapp/whatsappSendErrors.js";
import {
  WhatsappVehicleNotFoundError,
  WhatsappVehiclePartialSendError,
} from "../../../domains/crm/services/CrmWhatsapp/sendWhatsappVehicle.js";
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
    if (error instanceof AuthorizationError) {
      return jsonApiError(context, {
        code: "AUTHORIZATION_DENIED",
        error,
        message: error.message,
        status: 403,
      });
    }
    if (
      error instanceof WhatsappSessionNotFoundError ||
      error instanceof WhatsappMessageNotFoundError ||
      error instanceof WhatsappCampaignNotFoundError ||
      error instanceof WhatsappScheduledMessageNotFoundError ||
      error instanceof WhatsappTagNotFoundError ||
      error instanceof WhatsappConnectionNotFoundError ||
      error instanceof WhatsappVehicleNotFoundError ||
      error instanceof CrmLeadNotFoundError
    ) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (error instanceof WhatsappMessageActionError) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_MESSAGE_ACTION_ERROR",
        error,
        message: error.message,
        status: error.status,
      });
    }
    if (error instanceof CrmWhatsappGatewayError) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_GATEWAY_ERROR",
        error,
        message: error.message,
        status: 502,
      });
    }
    if (error instanceof WhatsappBotIntegrationIncompleteError) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_BOT_INTEGRATION_INCOMPLETE",
        error,
        message: error.message,
        status: 422,
      });
    }
    if (error instanceof WhatsappBotIntegrationUnauthorizedError) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_BOT_UNAUTHORIZED",
        error,
        message: error.message,
        status: 401,
      });
    }
    if (error instanceof WhatsappBotActionError) {
      return jsonApiError(context, {
        code: error.code,
        error,
        message: error.message,
        status: error.status,
      });
    }
    if (error instanceof WhatsappVehiclePartialSendError) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_VEHICLE_PARTIAL_SEND",
        error,
        message: error.message,
        status: 502,
      });
    }
    if (error instanceof WhatsappQuickMessageError) {
      const status = [400, 404, 422].includes(error.status)
        ? (error.status as 400 | 404 | 422)
        : 400;
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_QUICK_MESSAGE_ERROR",
        error,
        message: error.message,
        status,
      });
    }
    if (error instanceof WhatsappWebhookEventRetryError) {
      return jsonApiError(context, {
        code: "CRM_WHATSAPP_WEBHOOK_EVENT_RETRY_ERROR",
        error,
        message: error.message,
        status: error.status,
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
