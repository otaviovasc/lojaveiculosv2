import type { ServiceContext } from "../../shared/serviceContext.js";
import type { OlxCrmOnboardingResult } from "../marketplace/ports/marketplaceOlxCrmOnboarding.js";
import { OLX_CRM_CONNECTION_SETUP_PERMISSION } from "./onboardOlxCrmConnectionSupport.js";
import { CrmConnectionSetupProviderError } from "./ports/crmConnectionSetupProvider.js";

export type OlxCapabilityFailure = {
  code: string;
  httpStatus: number | null;
  providerRequestId: string | null;
  retryable: boolean;
};

export function createOlxCapabilityFailureRecorder(
  context: ServiceContext,
  input: {
    connectionId: string;
    failures: Partial<Record<"chat" | "leads", OlxCapabilityFailure>>;
    storeId: string;
    tenantId: string;
  },
) {
  return (capability: "chat" | "leads") => (error: unknown) => {
    const failure = readOlxCapabilityFailure(error);
    input.failures[capability] = failure;
    context.logger.warn("crm.connection.olx.capability.setup.failed", {
      capability,
      connectionId: input.connectionId,
      providerErrorCode: failure.code,
      providerHttpStatus: failure.httpStatus,
      providerRequestId: failure.providerRequestId,
      requestId: context.requestId,
      retryable: failure.retryable,
      storeId: input.storeId,
      tenantId: input.tenantId,
    });
  };
}

export function readOlxCapabilityFailure(error: unknown): OlxCapabilityFailure {
  if (error instanceof CrmConnectionSetupProviderError) {
    return {
      code: error.code,
      httpStatus: error.httpStatus ?? null,
      providerRequestId: error.providerRequestId ?? null,
      retryable:
        error.retryable ??
        (error.code === "rate_limited" ||
          error.code === "request_failed" ||
          (error.httpStatus !== undefined && error.httpStatus >= 500)),
    };
  }
  return {
    code: "request_failed",
    httpStatus: null,
    providerRequestId: null,
    retryable: true,
  };
}

export async function recordOlxOnboardingOutcome(
  context: ServiceContext,
  input: { storeId: string; tenantId: string },
  result: OlxCrmOnboardingResult,
) {
  const outcome = result.status === "active" ? "succeeded" : "failed";
  const metadata = {
    actorId: context.actor.id,
    chatStatus: result.capabilities.chat.status,
    connectionId: result.connectionId,
    leadsStatus: result.capabilities.leads.status,
    provider: "olx_chat",
    requestId: context.requestId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  };
  context.logger.info("crm.connection.olx.onboard.completed", metadata);
  await context.audit.record({
    action: "crm.connection.olx.onboard",
    actor: context.actor,
    category: "integration",
    entityId: result.connectionId,
    entityType: "crm_connection",
    metadata: {
      capabilityStatuses: {
        chat: result.capabilities.chat.status,
        leads: result.capabilities.leads.status,
      },
      permission: OLX_CRM_CONNECTION_SETUP_PERMISSION,
      provider: "olx_chat",
    },
    outcome,
    requestId: context.requestId,
    storeId: input.storeId,
    tenantId: input.tenantId,
    summary: "Configured OLX CRM connection",
  });
}
