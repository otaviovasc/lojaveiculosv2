import type { Context } from "hono";
import {
  BillingContractUnavailableError,
  BillingQuotaExceededError,
} from "../../../domains/billing/ports/billingQuotaGuard.js";
import { CrmConnectionSetupProviderError } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  CrmChannelConnectionCredentialStateError,
  CrmChannelConnectionProviderAlreadyExistsError,
} from "../../../domains/crm/channelConnections/connectionCreation.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";
import { OlxChatSetupRetryTargetError } from "../../../domains/crm/services/CrmService/retryOlxChatSetup.js";

export function handleCrmMessagingConnectionError(
  context: Context,
  error: unknown,
) {
  if (error instanceof OlxChatSetupRetryTargetError) {
    return jsonApiError(context, {
      code:
        error.reason === "not_found"
          ? "CRM_OLX_CHAT_CONNECTION_NOT_FOUND"
          : error.reason === "wrong_provider"
            ? "CRM_OLX_CHAT_SETUP_PROVIDER_MISMATCH"
            : error.reason === "already_configured"
              ? "CRM_OLX_CHAT_SETUP_ALREADY_CONFIGURED"
              : "CRM_OLX_CHAT_AUTHORIZATION_UNAVAILABLE",
      error,
      message: error.message,
      status: error.reason === "not_found" ? 404 : 409,
    });
  }
  if (error instanceof CrmChannelConnectionProviderAlreadyExistsError) {
    return jsonApiError(context, {
      code: "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
      details: { provider: error.provider },
      error,
      message: error.message,
      status: 409,
    });
  }
  if (error instanceof CrmChannelConnectionCredentialStateError) {
    return jsonApiError(context, {
      code: "CRM_ZAPI_CREDENTIAL_PARTIAL_STATE",
      error,
      message: error.message,
      status: 409,
    });
  }
  if (error instanceof BillingQuotaExceededError) {
    return jsonApiError(context, {
      code: "CRM_WHATSAPP_CONNECTION_ALLOWANCE_EXHAUSTED",
      details: {
        limit: error.limit,
        quotaKey: error.quotaKey,
        used: error.current,
      },
      error,
      message: error.message,
      status: 409,
    });
  }
  if (error instanceof BillingContractUnavailableError) {
    return jsonApiError(context, {
      code: "BILLING_CONTRACT_UNAVAILABLE",
      error,
      message: error.message,
      status: 409,
    });
  }
  if (error instanceof CrmConnectionSetupProviderError) {
    const status =
      error.code === "rate_limited"
        ? 429
        : error.code === "provider_outcome_indeterminate"
          ? 409
          : error.code === "pairing_disconnect_required"
            ? 409
            : error.code === "pairing_method_required"
              ? 409
              : error.code === "configuration_error"
                ? 503
                : 502;
    if (status === 429) {
      context.header("Retry-After", String(error.retryAfterSeconds ?? 1));
    }
    return jsonApiError(context, {
      code: `CRM_CONNECTION_SETUP_${error.code.toUpperCase()}`,
      ...(error.providerRequestId ||
      error.httpStatus ||
      error.retryable !== undefined
        ? {
            details: {
              providerHttpStatus: error.httpStatus ?? null,
              providerRequestId: error.providerRequestId ?? null,
              retryable: error.retryable ?? false,
              ...(error.retryAfterSeconds
                ? { retryAfterSeconds: error.retryAfterSeconds }
                : {}),
            },
          }
        : error.retryAfterSeconds
          ? { details: { retryAfterSeconds: error.retryAfterSeconds } }
          : error.code === "pairing_disconnect_required"
            ? { details: { nextAction: "disconnect_connection" } }
            : error.code === "pairing_method_required"
              ? { details: { nextAction: "request_phone_code" } }
              : {}),
      error,
      message: error.message,
      retryable: error.retryable ?? status >= 500,
      status,
    });
  }
  return undefined;
}
