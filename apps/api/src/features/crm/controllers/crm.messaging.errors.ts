import type { Context } from "hono";
import { CrmLeadNotFoundError } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import {
  CrmLeadOutcomeCommandConflictError,
  CrmLeadOutcomeValidationError,
} from "../../../domains/crm/services/CrmService/concludeCrmAttendance.js";
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
import {
  CrmConnectionNotFoundError,
  CrmCampaignNotFoundError,
  CrmMessageActionError,
  CrmMessageDtoNotFoundError,
  CrmScheduledMessageNotFoundError,
  ConversationCycleNotFoundError,
  ConversationCycleRevisionConflictError,
  ConversationCycleCommandConflictError,
  CrmTagNotFoundError,
} from "../../../domains/crm/messaging/crmMessagingErrors.js";
import {
  WhatsappVehicleNotFoundError,
  WhatsappVehiclePartialSendError,
} from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappVehicle.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { commonApiErrorResponse } from "../../../infrastructure/http/commonApiErrorResponse.js";
import { OlxWebhookRejectedError } from "../../../domains/crm/services/CrmMessagingService/authorizeOlxChatWebhook.js";
import { handleCrmMessagingConnectionError } from "./crm.channelConnections.errors.js";
import { CrmMessagingValidationError } from "./crm.messaging.validationError.js";
import { CrmRoutingPolicyValidationError } from "../../../domains/crm/services/CrmRoutingService/routingErrors.js";

export { CrmMessagingValidationError } from "./crm.messaging.validationError.js";

export async function handleCrmMessaging(
  context: Context,
  action: () => Promise<Response>,
): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    const commonErrorResponse = commonApiErrorResponse(context, error);
    if (commonErrorResponse) return commonErrorResponse;

    if (error instanceof CrmMessagingValidationError) {
      return jsonApiError(context, {
        code: "CRM_MESSAGING_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof CrmRoutingPolicyValidationError) {
      return jsonApiError(context, {
        code: "CRM_ROUTING_POLICY_BLOCKED",
        details: { reason: error.reason },
        error,
        message: error.message,
        status: 422,
      });
    }
    if (error instanceof CrmLeadOutcomeValidationError) {
      return jsonApiError(context, {
        code: "CRM_LEAD_OUTCOME_VALIDATION_ERROR",
        error,
        message: error.message,
        status: 400,
      });
    }
    if (error instanceof CrmLeadOutcomeCommandConflictError) {
      return jsonApiError(context, {
        code: "CRM_LEAD_OUTCOME_COMMAND_CONFLICT",
        error,
        message: error.message,
        status: 409,
      });
    }
    if (error instanceof OlxWebhookRejectedError) {
      if (error.status === 429) context.header("Retry-After", "60");
      return jsonApiError(context, {
        code:
          error.status === 429
            ? "CRM_OLX_WEBHOOK_RATE_LIMITED"
            : error.status === 409
              ? "CRM_OLX_WEBHOOK_REPLAY_CONFLICT"
              : "CRM_OLX_WEBHOOK_REJECTED",
        error,
        message: error.message,
        retryable: error.status === 429,
        status: error.status,
      });
    }
    const connectionErrorResponse = handleCrmMessagingConnectionError(
      context,
      error,
    );
    if (connectionErrorResponse) return connectionErrorResponse;
    if (
      error instanceof ConversationCycleNotFoundError ||
      error instanceof CrmMessageDtoNotFoundError ||
      error instanceof CrmCampaignNotFoundError ||
      error instanceof CrmScheduledMessageNotFoundError ||
      error instanceof CrmTagNotFoundError ||
      error instanceof CrmConnectionNotFoundError ||
      error instanceof WhatsappVehicleNotFoundError ||
      error instanceof CrmLeadNotFoundError
    ) {
      return jsonApiError(context, {
        code: "CRM_MESSAGING_NOT_FOUND",
        error,
        message: error.message,
        status: 404,
      });
    }
    if (error instanceof CrmMessageActionError) {
      return jsonApiError(context, {
        code: "CRM_MESSAGE_ACTION_ERROR",
        error,
        message: error.message,
        status: error.status,
      });
    }
    if (error instanceof ConversationCycleRevisionConflictError) {
      return jsonApiError(context, {
        code: "CRM_CONVERSATION_CYCLE_REVISION_CONFLICT",
        error,
        message: error.message,
        status: 409,
      });
    }
    if (error instanceof ConversationCycleCommandConflictError) {
      return jsonApiError(context, {
        code: "CRM_CONVERSATION_CYCLE_COMMAND_CONFLICT",
        error,
        message: error.message,
        status: 409,
      });
    }
    if (error instanceof CrmMessagingCapabilityError) {
      return jsonApiError(context, {
        code: "CRM_MESSAGING_PROVIDER_CAPABILITY_UNAVAILABLE",
        error,
        message: error.message,
        status: 409,
      });
    }
    if (error instanceof CrmMessagingGatewayError) {
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
    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}
