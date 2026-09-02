import type { Context } from "hono";
import {
  CrmMessagingCapabilityError,
  CrmMessagingGatewayError,
} from "../../../domains/crm/ports/crmMessagingGateway.js";
import {
  ExternalBotIntegrationIncompleteError,
  ExternalBotIntegrationValidationError,
} from "../../../domains/crm/services/CrmExternalBotService/externalBotIntegration.js";
import { CrmQuickMessageError } from "../../../domains/crm/services/CrmMessagingService/crmQuickMessageServiceSupport.js";
import { ProviderEventRetryError } from "../../../domains/crm/services/CrmMessagingService/providerEventIssues.js";
import { WhatsappVehiclePartialSendError } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappVehicle.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";

export function handleCrmMessagingProviderError(
  context: Context,
  error: unknown,
): Response | null {
  if (error instanceof CrmMessagingCapabilityError) {
    return jsonApiError(context, {
      code: "CRM_MESSAGING_PROVIDER_CAPABILITY_UNAVAILABLE",
      error,
      message: error.message,
      status: 409,
    });
  }
  if (error instanceof CrmMessagingGatewayError) {
    if (error.code === "configuration_error") {
      return jsonApiError(context, {
        code: "CRM_MESSAGING_CONFIGURATION_ERROR",
        error,
        message: error.message,
        retryable: false,
        status: error.status,
      });
    }
    if (error.status === 429) {
      const retryAfterSeconds = error.retryAfterSeconds ?? 1;
      context.header("Retry-After", String(retryAfterSeconds));
      return jsonApiError(context, {
        code: "CRM_MESSAGING_PROVIDER_RATE_LIMITED",
        details: { retryAfterSeconds },
        error,
        message: error.message,
        retryable: true,
        status: 429,
      });
    }
    return jsonApiError(context, {
      code: "CRM_MESSAGING_PROVIDER_ERROR",
      error,
      message: error.message,
      retryable: error.status >= 500,
      status: error.status,
    });
  }
  if (error instanceof ExternalBotIntegrationIncompleteError) {
    return jsonApiError(context, {
      code: "CRM_EXTERNAL_BOT_INTEGRATION_INCOMPLETE",
      error,
      message: error.message,
      status: 422,
    });
  }
  if (error instanceof ExternalBotIntegrationValidationError) {
    return jsonApiError(context, {
      code: "CRM_EXTERNAL_BOT_INTEGRATION_INVALID",
      error,
      message: error.message,
      status: 400,
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
  if (error instanceof CrmQuickMessageError) {
    const status = [400, 404, 422].includes(error.status)
      ? (error.status as 400 | 404 | 422)
      : 400;
    return jsonApiError(context, {
      code: "CRM_QUICK_MESSAGE_ERROR",
      error,
      message: error.message,
      status,
    });
  }
  if (error instanceof ProviderEventRetryError) {
    return jsonApiError(context, {
      code: "CRM_WHATSAPP_WEBHOOK_EVENT_RETRY_ERROR",
      error,
      message: error.message,
      retryable: true,
      status: error.status,
    });
  }
  return null;
}
