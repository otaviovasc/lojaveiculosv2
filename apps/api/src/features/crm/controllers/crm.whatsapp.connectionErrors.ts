import type { Context } from "hono";
import {
  BillingContractUnavailableError,
  BillingQuotaExceededError,
} from "../../../domains/billing/ports/billingQuotaGuard.js";
import { CrmConnectionSetupProviderError } from "../../../domains/crm/ports/crmConnectionSetupProvider.js";
import {
  WhatsappConnectionCredentialStateError,
  WhatsappConnectionProviderAlreadyExistsError,
} from "../../../domains/crm/whatsapp/whatsappConnectionCreation.js";
import { jsonApiError } from "../../../infrastructure/http/apiErrorResponse.js";

export function handleWhatsappConnectionError(
  context: Context,
  error: unknown,
) {
  if (error instanceof WhatsappConnectionProviderAlreadyExistsError) {
    return jsonApiError(context, {
      code: "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
      details: { provider: error.provider },
      error,
      message: error.message,
      status: 409,
    });
  }
  if (error instanceof WhatsappConnectionCredentialStateError) {
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
      ...(error.retryAfterSeconds
        ? { details: { retryAfterSeconds: error.retryAfterSeconds } }
        : error.code === "pairing_disconnect_required"
          ? { details: { nextAction: "disconnect_connection" } }
          : error.code === "pairing_method_required"
            ? { details: { nextAction: "request_phone_code" } }
            : {}),
      error,
      message: error.message,
      status,
    });
  }
  return undefined;
}
