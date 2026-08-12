import {
  CrmWhatsappCapabilityError,
  CrmWhatsappGatewayError,
} from "../ports/crmWhatsappGateway.js";
import type { CrmWhatsappOutboundIntentRepository } from "../ports/crmWhatsappOutboundIntentRepository.js";
import {
  WhatsappMessageActionError,
  WhatsappMessageNotFoundError,
} from "./whatsappSendErrors.js";

type FailureKind = "failed" | "indeterminate" | "retryable_failed";

export async function recordOutboundProviderFailure(
  repository: CrmWhatsappOutboundIntentRepository,
  intent: { claimToken: string; id: string },
  error: unknown,
) {
  const kind = classifyOutboundProviderFailure(error);
  if (kind === "indeterminate") {
    await repository.markIndeterminate(intent).catch(() => undefined);
    return;
  }
  const descriptor = failureDescriptor(error);
  await repository
    .recordProviderFailure({
      ...intent,
      failure: descriptor,
      retryable: kind === "retryable_failed",
    })
    .catch(() => undefined);
}

export function throwPersistedOutboundFailure(
  value: Record<string, unknown> | null,
): never {
  const code = readCode(value?.code);
  const status = readStatus(value?.status);
  const retryAfterSeconds = readNumber(value?.retryAfterSeconds);
  throw new CrmWhatsappGatewayError(
    "CRM WhatsApp provider rejected the previous delivery attempt.",
    status,
    retryAfterSeconds,
    code,
  );
}

function classifyOutboundProviderFailure(error: unknown): FailureKind {
  if (error instanceof CrmWhatsappCapabilityError) return "failed";
  if (error instanceof CrmWhatsappGatewayError) {
    if (error.code === "timeout" || error.code === "request_failed") {
      return "indeterminate";
    }
    if (
      error.code === "rate_limited" ||
      error.code === "provider_unavailable"
    ) {
      return "retryable_failed";
    }
    return "failed";
  }
  if (
    error instanceof WhatsappMessageActionError ||
    error instanceof WhatsappMessageNotFoundError
  ) {
    return "failed";
  }
  return "indeterminate";
}

function failureDescriptor(error: unknown) {
  if (!(error instanceof CrmWhatsappGatewayError)) {
    return { code: "validation_failed", status: 409 };
  }
  return {
    code: error.code,
    ...(error.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: error.retryAfterSeconds }),
    status: error.status,
  };
}

function readCode(value: unknown): CrmWhatsappGatewayError["code"] {
  if (
    value === "configuration_error" ||
    value === "provider_rejected" ||
    value === "provider_unavailable" ||
    value === "rate_limited" ||
    value === "request_failed" ||
    value === "timeout"
  ) {
    return value;
  }
  return "provider_rejected";
}

function readStatus(value: unknown): 409 | 429 | 502 {
  return value === 409 || value === 429 ? value : 502;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
