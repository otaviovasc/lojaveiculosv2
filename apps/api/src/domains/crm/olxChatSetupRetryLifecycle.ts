import type { ServiceContext } from "../../shared/serviceContext.js";
import type { OlxCapabilityFailure } from "./olxOnboardingDiagnostics.js";
import type { CrmConnection } from "./ports/crmConnectionRepository.js";
import { readRecord } from "./onboardOlxCrmConnectionSupport.js";
import { ensureFirstReadyChannelDefault } from "./services/CrmRoutingService/ensureFirstReadyChannelDefault.js";
import {
  getCrmConnectionRepository,
  runCrmTransaction,
  type CrmServicePorts,
} from "./services/CrmService/serviceSupport.js";
import {
  finishOlxChatSetupAttempt,
  recordOlxChatRetryOutcome,
} from "./olxChatSetupRetrySupport.js";
import type { OlxChatRetryStage } from "./olxChatSetupRetryTypes.js";

export function markOlxChatDispatchIndeterminate(
  claimed: CrmConnection,
  leaseOwner: string,
  ports: CrmServicePorts,
) {
  return runCrmTransaction(ports, async (transactionPorts) => {
    const setup = readRecord(claimed.metadata.webhookSetup);
    const marked = await getCrmConnectionRepository(
      transactionPorts,
    ).finishOlxWebhookSetup?.({
      connectionId: claimed.id,
      leaseOwner,
      metadata: {
        webhookSetup: {
          ...setup,
          dispatch: {
            attemptId: leaseOwner,
            idempotencyKey: `olx-chat-webhook:${claimed.id}`,
            preparedAt: new Date().toISOString(),
            state: "indeterminate",
          },
          lastErrorCode: "provider_outcome_indeterminate",
          status: "indeterminate",
          updatedAt: new Date().toISOString(),
        },
      },
      storeId: claimed.storeId,
      tenantId: claimed.tenantId,
    });
    if (!marked) {
      throw new Error(
        "OLX Chat setup lease was lost before provider dispatch.",
      );
    }
    return marked;
  });
}

export async function finalizeOlxChatAttempt(
  claimed: CrmConnection,
  leaseOwner: string,
  failure: OlxCapabilityFailure | null,
  configuredAt: string | null,
  ports: CrmServicePorts,
) {
  let firstError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await runCrmTransaction(ports, async (transactionPorts) => {
        const finished = await finishOlxChatSetupAttempt(
          getCrmConnectionRepository(transactionPorts),
          claimed,
          leaseOwner,
          failure,
          { storeId: claimed.storeId, tenantId: claimed.tenantId },
          configuredAt,
        );
        if (!finished) {
          throw new Error("OLX Chat setup lease was lost before completion.");
        }
      });
      return;
    } catch (error) {
      firstError ??= error;
    }
  }
  throw firstError;
}

export async function emitOlxChatRetryTerminalEvidence(
  context: ServiceContext,
  input: {
    connectionId: string;
    failure: OlxCapabilityFailure | null;
    finalizationSucceeded: boolean;
    outcome: "failed" | "succeeded";
    providerHttpStatus: number | null;
    providerRequestId: string | null;
    providerSucceeded: boolean;
    stage: OlxChatRetryStage;
  },
) {
  const metadata = {
    connectionId: input.connectionId,
    finalizationSucceeded: input.finalizationSucceeded,
    outcome: input.outcome,
    providerErrorCode: input.failure?.code ?? null,
    providerHttpStatus:
      input.failure?.httpStatus ?? input.providerHttpStatus ?? null,
    providerRequestId:
      input.failure?.providerRequestId ?? input.providerRequestId ?? null,
    providerSucceeded: input.providerSucceeded,
    requestId: context.requestId,
    stage: input.stage,
    storeId: context.storeId,
    tenantId: context.tenantId,
  };
  context.logger[input.outcome === "succeeded" ? "info" : "error"](
    "crm.connection.olx.chat.setup.retry.terminal",
    metadata,
  );
  try {
    await recordOlxChatRetryOutcome(
      context,
      input.connectionId,
      input.failure,
      input.outcome,
      {
        finalizationSucceeded: input.finalizationSucceeded,
        providerHttpStatus:
          input.failure?.httpStatus ?? input.providerHttpStatus ?? null,
        providerRequestId:
          input.failure?.providerRequestId ?? input.providerRequestId ?? null,
        providerSucceeded: input.providerSucceeded,
        stage: input.stage,
      },
    );
    return null;
  } catch (error) {
    context.logger.error("crm.connection.olx.chat.setup.retry.terminal", {
      ...metadata,
      stage: "audit",
    });
    return error;
  }
}

export async function synchronizeOlxRetryRouting(
  context: ServiceContext,
  claimed: CrmConnection,
  failure: OlxCapabilityFailure | null,
  ports: CrmServicePorts,
) {
  if (
    !ports.crmRoutingConnectionRepository ||
    !ports.crmRoutingPolicyRepository
  )
    return;
  try {
    if (failure) return;
    await ensureFirstReadyChannelDefault(
      context,
      { channel: "olx_chat", connectionId: claimed.id },
      ports,
    );
  } catch {
    context.logger.warn(
      "crm.connection.olx.chat.setup.routing_default.failed",
      {
        connectionId: claimed.id,
        providerSucceeded: failure === null,
        requestId: context.requestId,
        storeId: claimed.storeId,
        tenantId: claimed.tenantId,
      },
    );
  }
}
