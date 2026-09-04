import type { Context } from "hono";
import { CrmLeadNotFoundError } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import {
  CrmLeadOutcomeCommandConflictError,
  CrmLeadOutcomeValidationError,
} from "../../../domains/crm/services/CrmService/concludeCrmAttendance.js";
import {
  CrmConnectionNotFoundError,
  CrmCampaignNotFoundError,
  CrmMessageActionError,
  CrmOutboundReconciliationPendingError,
  CrmMessageDtoNotFoundError,
  CrmScheduledMessageNotFoundError,
  ConversationCycleNotFoundError,
  ConversationCycleRevisionConflictError,
  ConversationCycleCommandConflictError,
  CrmTagNotFoundError,
} from "../../../domains/crm/messaging/crmMessagingErrors.js";
import { WhatsappVehicleNotFoundError } from "../../../domains/crm/services/CrmWhatsappService/sendWhatsappVehicle.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { commonApiErrorResponse } from "../../../infrastructure/http/commonApiErrorResponse.js";
import { OlxWebhookRejectedError } from "../../../domains/crm/services/CrmMessagingService/authorizeOlxChatWebhook.js";
import { handleCrmMessagingConnectionError } from "./crm.channelConnections.errors.js";
import { CrmMessagingValidationError } from "./crm.messaging.validationError.js";
import { handleCrmMessagingProviderError } from "./crm.messaging.errorsSupport.js";
import { CrmRoutingPolicyValidationError } from "../../../domains/crm/services/CrmRoutingService/routingErrors.js";
import { CrmConnectionMemberValidationError } from "../../../domains/crm/services/CrmConnectionMemberService/crmConnectionMemberErrors.js";

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
    if (error instanceof CrmConnectionMemberValidationError) {
      return jsonApiError(context, {
        code:
          error.code === "connection_not_found"
            ? "CRM_MESSAGING_NOT_FOUND"
            : "CRM_CONNECTION_MEMBER_VALIDATION_ERROR",
        details: { reason: error.code },
        error,
        message: error.message,
        status:
          error.code === "connection_not_found"
            ? 404
            : error.code === "connection_last_member"
              ? 409
              : 400,
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
    if (error instanceof CrmOutboundReconciliationPendingError) {
      return jsonApiError(context, {
        code: "CRM_MESSAGING_OUTCOME_INDETERMINATE",
        error,
        message: error.message,
        status: error.status,
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
    const providerErrorResponse = handleCrmMessagingProviderError(
      context,
      error,
    );
    if (providerErrorResponse) return providerErrorResponse;
    return jsonApiError(context, {
      code: "INTERNAL_SERVER_ERROR",
      error,
      message: "Internal server error.",
      status: 500,
    });
  }
}
