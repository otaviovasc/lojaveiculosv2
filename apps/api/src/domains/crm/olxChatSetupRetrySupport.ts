import type { ServiceContext } from "../../shared/serviceContext.js";
import type { OlxCapabilityFailure } from "./olxOnboardingDiagnostics.js";
import { CrmConnectionSetupProviderError } from "./ports/crmConnectionSetupProvider.js";
import type {
  CrmConnection,
  CrmConnectionRepository,
} from "./ports/crmConnectionRepository.js";
import {
  OLX_CRM_CONNECTION_SETUP_PERMISSION,
  readRecord,
} from "./onboardOlxCrmConnectionSupport.js";
import type { OlxChatRetryStage } from "./olxChatSetupRetryTypes.js";
import { crmChannelConnectionCapabilityFacts } from "./channelConnections/connectionCreation.js";
import {
  OlxChatSetupRetryTargetError,
  buildOlxChatCallbackUrl,
} from "./olxChatCallbackUrl.js";

export { OlxChatSetupRetryTargetError, buildOlxChatCallbackUrl };

export function assertOlxChatSetupCanBeRetried(connection: CrmConnection) {
  const setup = readRecord(connection.metadata.webhookSetup);
  const chat = readRecord(readRecord(setup.capabilities).chat);
  if (setup.status === "configured" || chat.status === "active") {
    throw new OlxChatSetupRetryTargetError("already_configured");
  }
  const chatFailure = readRecord(readRecord(setup.failures).chat);
  const documentedChatActivationFailure =
    chatFailure.code === "provider_outcome_indeterminate" &&
    chatFailure.httpStatus === 500;
  if (
    setup.status === "indeterminate" ||
    (!documentedChatActivationFailure &&
      (setup.lastErrorCode === "provider_outcome_indeterminate" ||
        chatFailure.code === "provider_outcome_indeterminate"))
  ) {
    throw new CrmConnectionSetupProviderError(
      "OLX webhook registration outcome is indeterminate. Reconcile it before retrying.",
      "provider_outcome_indeterminate",
      undefined,
      undefined,
      undefined,
      false,
    );
  }
}

export async function finishOlxChatSetupAttempt(
  repository: CrmConnectionRepository,
  claimed: CrmConnection,
  leaseOwner: string,
  failure: OlxCapabilityFailure | null,
  scope: { storeId: string; tenantId: string },
  configuredAt: string | null = null,
) {
  const setup = readRecord(claimed.metadata.webhookSetup);
  const dispatch = readRecord(setup.dispatch);
  const capabilities = readRecord(setup.capabilities);
  const failures = readRecord(setup.failures);
  const providerOutcomeIndeterminate =
    failure?.code === "provider_outcome_indeterminate";
  const chat = failure
    ? {
        capability: "messaging",
        grantState: "granted",
        reason: providerOutcomeIndeterminate
          ? "provider_outcome_indeterminate"
          : failure.retryable
            ? "runtime_unavailable"
            : "provider_rejected",
        status: "error",
      }
    : {
        capability: "messaging",
        grantState: "granted",
        reason: null,
        status: "active",
      };
  const leads = readRecord(capabilities.leads);
  const activeCount = [chat, leads].filter(
    (item) => item.status === "active",
  ).length;
  const status = providerOutcomeIndeterminate
    ? "indeterminate"
    : activeCount === 2
      ? "configured"
      : activeCount
        ? "partial"
        : "failed";
  const hasDispatchAttempt = typeof dispatch.attemptId === "string";
  const dispatchState = providerOutcomeIndeterminate
    ? "indeterminate"
    : failure
      ? "rejected"
      : "confirmed";
  return repository.finishOlxWebhookSetup?.({
    connectionId: claimed.id,
    leaseOwner,
    metadata: {
      capabilities: crmChannelConnectionCapabilityFacts({
        broker: "direct",
        channel: "olx_chat",
        provider: "olx",
      }),
      connected: failure === null,
      degraded: failure !== null,
      errorCode: failure?.code ?? null,
      webhookSetup: {
        ...setup,
        capabilities: { ...capabilities, chat },
        configuredAt: configuredAt ?? setup.configuredAt ?? null,
        dispatch: hasDispatchAttempt
          ? {
              ...dispatch,
              completedAt: new Date().toISOString(),
              providerHttpStatus: failure?.httpStatus ?? null,
              providerRequestId: failure?.providerRequestId ?? null,
              state: dispatchState,
            }
          : setup.dispatch,
        failures: failure
          ? { ...failures, chat: failure }
          : Object.fromEntries(
              Object.entries(failures).filter(([key]) => key !== "chat"),
            ),
        lastErrorCode: failure ? failure.code : null,
        leaseExpiresAt: null,
        leaseOwner: null,
        status,
        updatedAt: new Date().toISOString(),
      },
    },
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
}

export function readOlxSetupAttemptCount(connection: CrmConnection) {
  const value = readRecord(connection.metadata.webhookSetup).attemptCount;
  return typeof value === "number" ? value : 0;
}

export async function recordOlxChatRetryOutcome(
  context: ServiceContext,
  connectionId: string,
  failure: OlxCapabilityFailure | null,
  outcome: "attempted" | "failed" | "succeeded",
  terminal?: {
    finalizationSucceeded: boolean;
    providerHttpStatus: number | null;
    providerRequestId: string | null;
    providerSucceeded: boolean;
    stage: OlxChatRetryStage;
  },
) {
  const metadata = {
    connectionId,
    providerErrorCode: failure?.code ?? null,
    providerHttpStatus: failure?.httpStatus ?? null,
    providerRequestId: failure?.providerRequestId ?? null,
    requestId: context.requestId,
    retryable: failure?.retryable ?? false,
    storeId: context.storeId,
    tenantId: context.tenantId,
    ...(terminal ?? {}),
  };
  context.logger.info("crm.connection.olx.chat.setup.retry.completed", {
    ...metadata,
    outcome,
  });
  await context.audit.record({
    action: "crm.connection.olx.chat.setup.retry",
    actor: context.actor,
    category: "integration",
    failureTier: "required",
    entityId: connectionId,
    entityType: "crm_connection",
    metadata: {
      permission: OLX_CRM_CONNECTION_SETUP_PERMISSION,
      provider: "olx_chat",
      providerErrorCode: failure?.code ?? null,
      providerHttpStatus: failure?.httpStatus ?? null,
      providerRequestId: failure?.providerRequestId ?? null,
      retryable: failure?.retryable ?? false,
      ...(terminal ?? {}),
    },
    outcome,
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Retried OLX Chat registration",
    tenantId: context.tenantId,
  });
}
