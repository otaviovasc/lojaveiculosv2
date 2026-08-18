import { randomUUID } from "node:crypto";
import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE,
  OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
} from "../../ports/crmOlxCredentials.js";
import { CrmConnectionSetupProviderError } from "../../ports/crmConnectionSetupProvider.js";
import { readOlxCapabilityFailure } from "../../olxOnboardingDiagnostics.js";
import {
  OLX_CRM_CONNECTION_SETUP_PERMISSION,
  readRecord,
} from "../../onboardOlxCrmConnectionSupport.js";
import { getCrmConnectionCredentialVault } from "./crmConnectionSetupSupport.js";
import {
  getCrmConnectionRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "./serviceSupport.js";
import {
  assertOlxChatSetupCanBeRetried,
  buildOlxChatCallbackUrl,
  OlxChatSetupRetryTargetError,
  readOlxSetupAttemptCount,
} from "../../olxChatSetupRetrySupport.js";
import type {
  OlxChatRetryStage,
  RetryOlxChatSetupResult,
} from "../../olxChatSetupRetryTypes.js";
import {
  emitOlxChatRetryTerminalEvidence,
  finalizeOlxChatAttempt,
  markOlxChatDispatchIndeterminate,
  synchronizeOlxRetryRouting,
} from "../../olxChatSetupRetryLifecycle.js";

export { OlxChatSetupRetryTargetError } from "../../olxChatSetupRetrySupport.js";
export type { RetryOlxChatSetupResult } from "../../olxChatSetupRetryTypes.js";

export async function retryOlxChatSetup(
  context: ServiceContext,
  input: { connectionId: string },
  ports: CrmServicePorts,
): Promise<RetryOlxChatSetupResult> {
  assertPermission(context, OLX_CRM_CONNECTION_SETUP_PERMISSION);
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  const scope = requireCrmScope(context);
  const repository = getCrmConnectionRepository(ports);
  const connection = (
    await repository.listConnections({
      storeId: scope.storeId as never,
      tenantId: scope.tenantId as never,
    })
  ).find((candidate) => candidate.id === input.connectionId);
  if (!connection || connection.status === "archived") {
    throw new OlxChatSetupRetryTargetError("not_found");
  }
  if (connection.channel !== "olx_chat" || connection.provider !== "olx") {
    throw new OlxChatSetupRetryTargetError("wrong_provider");
  }
  assertOlxChatSetupCanBeRetried(connection);
  const stored = readRecord(connection.credentialsRef.stored);
  if (
    typeof stored.accessToken !== "string" ||
    typeof stored.webhookSecret !== "string" ||
    !connection.webhookUrl
  ) {
    throw new OlxChatSetupRetryTargetError("credentials_unavailable");
  }
  const provider = ports.olxCrmWebhookSetupProvider;
  const canonicalApiOrigin = ports.olxCrmCallbackOrigin;
  if (
    !provider ||
    !canonicalApiOrigin ||
    !repository.claimOlxWebhookSetup ||
    !repository.finishOlxWebhookSetup
  ) {
    throw new CrmConnectionSetupProviderError(
      "OLX Chat setup is unavailable.",
      "configuration_error",
      undefined,
      undefined,
      undefined,
      true,
    );
  }

  const leaseOwner = randomUUID();
  const now = new Date();
  const claimed = await repository.claimOlxWebhookSetup({
    connectionId: connection.id,
    leaseExpiresAt: new Date(now.getTime() + 60_000),
    leaseOwner,
    now,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!claimed) {
    throw new CrmConnectionSetupProviderError(
      "OLX Chat setup is already in progress.",
      "request_failed",
      undefined,
      undefined,
      undefined,
      true,
    );
  }
  let stage: OlxChatRetryStage = "audit";
  let attempt = claimed;
  let originalError: unknown = null;
  let failure: ReturnType<typeof readOlxCapabilityFailure> | null = null;
  let diagnostics: { httpStatus: number; providerRequestId: string | null } = {
    httpStatus: 200,
    providerRequestId: null,
  };
  let providerSucceeded = false;
  try {
    await recordOlxChatRetryAttempt(context, connection.id);
    stage = "vault";
    const vault = getCrmConnectionCredentialVault(ports);
    const [accessToken, webhookSecret] = await Promise.all([
      vault.open({
        purpose: OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE,
        sealed: stored.accessToken,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      }),
      vault.open({
        purpose: OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
        sealed: stored.webhookSecret,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      }),
    ]);
    stage = "callback";
    const callbackUrl = buildOlxChatCallbackUrl({
      allowLocalHttp: ["local", "test"].includes(ports.environment ?? ""),
      canonicalApiOrigin,
      connectionId: connection.id,
      storedWebhookUrl: connection.webhookUrl,
      webhookSecret,
    });
    stage = "dispatch";
    attempt = await markOlxChatDispatchIndeterminate(
      claimed,
      leaseOwner,
      ports,
    );
    stage = "provider";
    diagnostics =
      (await provider.configureChat({ accessToken, callbackUrl })) ??
      diagnostics;
    providerSucceeded = true;
  } catch (error) {
    originalError = error;
    failure = readOlxCapabilityFailure(error);
  }

  const configuredAt = providerSucceeded ? new Date().toISOString() : null;
  let finalizationError: unknown = null;
  try {
    await finalizeOlxChatAttempt(
      attempt,
      leaseOwner,
      failure,
      configuredAt,
      ports,
    );
  } catch (error) {
    finalizationError = error;
  }
  const finalizationSucceeded = finalizationError === null;
  const outcome =
    providerSucceeded && finalizationSucceeded ? "succeeded" : "failed";
  const evidenceError = await emitOlxChatRetryTerminalEvidence(context, {
    connectionId: connection.id,
    failure,
    finalizationSucceeded,
    outcome,
    providerHttpStatus: providerSucceeded ? diagnostics.httpStatus : null,
    providerRequestId: providerSucceeded ? diagnostics.providerRequestId : null,
    providerSucceeded,
    stage: finalizationError ? "finalization" : stage,
  });

  if (finalizationSucceeded) {
    await synchronizeOlxRetryRouting(context, attempt, failure, ports);
  }
  if (originalError) throw originalError;
  if (finalizationError) throw finalizationError;
  if (evidenceError) throw evidenceError;
  if (!configuredAt) throw new Error("OLX Chat setup did not complete.");
  return {
    channel: "olx_chat",
    connectionId: connection.id,
    diagnostics: {
      httpStatus: diagnostics.httpStatus,
      providerRequestId: diagnostics.providerRequestId,
      retryable: false,
    },
    provider: "olx",
    readiness: { ready: true },
    setup: {
      attemptCount: readOlxSetupAttemptCount(attempt),
      configuredAt,
      status: "configured",
    },
  };
}

async function recordOlxChatRetryAttempt(
  context: ServiceContext,
  connectionId: string,
) {
  const metadata = {
    connectionId,
    requestId: context.requestId,
    storeId: context.storeId,
    tenantId: context.tenantId,
  };
  context.logger.info("crm.connection.olx.chat.setup.retry.completed", {
    ...metadata,
    outcome: "attempted",
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
      provider: "olx",
    },
    outcome: "attempted",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Retried OLX Chat registration",
    tenantId: context.tenantId,
  });
}
