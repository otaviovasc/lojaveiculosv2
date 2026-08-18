import {
  CrmMessagingCapabilityError,
  CrmMessagingGatewayError,
} from "../ports/crmMessagingGateway.js";
import type { CrmOutboundIntentRepository } from "../ports/crmOutboundIntentRepository.js";
import {
  CrmMessageActionError,
  CrmMessageDtoNotFoundError,
} from "./crmMessagingErrors.js";

type FailureKind = "failed" | "indeterminate" | "retryable_failed";

export async function recordOutboundProviderFailure(
  repository: CrmOutboundIntentRepository,
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
  throw new CrmMessagingGatewayError(
    "CRM messaging provider rejected the previous delivery attempt.",
    status,
    retryAfterSeconds,
    code,
  );
}

function classifyOutboundProviderFailure(error: unknown): FailureKind {
  if (error instanceof CrmMessagingCapabilityError) return "failed";
  if (error instanceof CrmMessagingGatewayError) {
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
    error instanceof CrmMessageActionError ||
    error instanceof CrmMessageDtoNotFoundError
  ) {
    return "failed";
  }
  return "indeterminate";
}

function failureDescriptor(error: unknown) {
  if (!(error instanceof CrmMessagingGatewayError)) {
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

function readCode(value: unknown): CrmMessagingGatewayError["code"] {
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
