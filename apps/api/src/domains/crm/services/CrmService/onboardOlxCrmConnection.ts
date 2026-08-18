import { randomBytes, randomUUID } from "node:crypto";
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
import type { CrmServicePorts } from "./serviceSupport.js";
import {
  getCrmConnectionRepository,
  runCrmTransaction,
} from "./serviceSupport.js";
import { getCrmConnectionCredentialVault } from "./crmConnectionSetupSupport.js";
import {
  assertFinishedOlxSetup,
  buildOlxOnboardingResult,
  configureOlxCapability,
  OLX_CRM_CONNECTION_SETUP_PERMISSION,
  readOlxOnboardingResult,
  readRecord,
} from "../../onboardOlxCrmConnectionSupport.js";
import { ensureFirstReadyChannelDefault } from "../CrmRoutingService/ensureFirstReadyChannelDefault.js";
import {
  createOlxCapabilityFailureRecorder,
  type OlxCapabilityFailure,
  recordOlxOnboardingOutcome,
} from "../../olxOnboardingDiagnostics.js";

export async function onboardOlxCrmConnection(
  context: ServiceContext,
  input: {
    accessToken: string;
    canonicalApiOrigin: string;
    providerAccountId: string | null;
    scopes: readonly string[];
    storeId: string;
    tenantId: string;
  },
  ports: CrmServicePorts,
) {
  assertPermission(context, OLX_CRM_CONNECTION_SETUP_PERMISSION);
  assertEntitlement(context as StoreScopedServiceContext, "crm");
  context.logger.info("crm.connection.olx.onboard.started", {
    actorId: context.actor.id,
    provider: "olx_chat",
    requestId: context.requestId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (context.storeId !== input.storeId || context.tenantId !== input.tenantId)
    throw new Error("OLX CRM OAuth scope binding mismatch.");
  const providerAccountId = input.providerAccountId?.trim();
  if (!providerAccountId) {
    throw new Error(
      "OLX account identity could not be authoritatively verified.",
    );
  }
  const repository = getCrmConnectionRepository(ports);
  const vault = getCrmConnectionCredentialVault(ports);
  const provider = ports.olxCrmWebhookSetupProvider;
  if (
    !provider ||
    !repository.claimOlxWebhookSetup ||
    !repository.finishOlxWebhookSetup
  )
    throw new Error("OLX CRM onboarding is unavailable.");
  const [accessToken, webhookSecret] = await Promise.all([
    vault.seal({
      plaintext: input.accessToken,
      purpose: OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE,
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    }),
    vault.seal({
      plaintext: randomBytes(32).toString("base64url"),
      purpose: OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    }),
  ]);
  const authorization = await runCrmTransaction(ports, (transactionPorts) =>
    getCrmConnectionRepository(transactionPorts).upsertOlxConnection({
      credentialsRef: { stored: { accessToken, webhookSecret } },
      displayName: "OLX Chat",
      externalConnectionId: providerAccountId,
      metadata: {},
      status: "error",
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
      webhookUrl: null,
    }),
  );
  const connection = authorization.connection;
  if (authorization.replacedConnectionId) {
    await context.audit.record({
      action: "crm.connection.olx.identity_replaced",
      actor: context.actor,
      category: "authorization",
      entityId: connection.id,
      entityType: "crm_connection",
      metadata: {
        permission: OLX_CRM_CONNECTION_SETUP_PERMISSION,
        previousConnectionId: authorization.replacedConnectionId,
        provider: "olx_chat",
      },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: input.storeId,
      summary: "Replaced OLX connection after provider account changed",
      tenantId: input.tenantId,
    });
  }
  await repository.updateConnection({
    connectionId: connection.id,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    webhookUrl: `${input.canonicalApiOrigin}/api/v1/crm/webhooks/olx/${connection.id}/received`,
  });
  const leaseOwner = randomUUID();
  const now = new Date();
  const claimed = await repository.claimOlxWebhookSetup({
    connectionId: connection.id,
    leaseExpiresAt: new Date(now.getTime() + 60_000),
    leaseOwner,
    now,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  if (!claimed) {
    const result = readOlxOnboardingResult(connection, input.scopes);
    await recordOlxOnboardingOutcome(context, input, result);
    return result;
  }
  const configuredStored = readRecord(connection.credentialsRef.stored);
  const configuredWebhookSecret = configuredStored.webhookSecret;
  if (typeof configuredWebhookSecret !== "string") {
    throw new Error("OLX webhook credential is unavailable.");
  }
  const secret = await vault.open({
    purpose: OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
    sealed: configuredWebhookSecret,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  const base = `${input.canonicalApiOrigin}/api/v1/crm/webhooks/olx/${connection.id}`;
  const failures: Partial<Record<"chat" | "leads", OlxCapabilityFailure>> = {};
  const recordFailure = createOlxCapabilityFailureRecorder(context, {
    connectionId: connection.id,
    failures,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  const leads = await configureOlxCapability(
    "autoservice",
    input.scopes,
    "lead_ingestion",
    () =>
      provider.configureLeads({
        accessToken: input.accessToken,
        callbackUrl: `${base}/leads`,
        token: secret,
      }),
    recordFailure("leads"),
  );
  const chat = await configureOlxCapability(
    "chat",
    input.scopes,
    "messaging",
    () =>
      provider.configureChat({
        accessToken: input.accessToken,
        callbackUrl: `${base}/received?token=${encodeURIComponent(secret)}`,
      }),
    recordFailure("chat"),
  );
  const capabilities = { chat, leads };
  const capabilityValues = Object.values(capabilities);
  const activeCount = capabilityValues.filter(
    (capability) => capability.status === "active",
  ).length;
  const errorCount = capabilityValues.filter(
    (capability) => capability.status === "error",
  ).length;
  const setupStatus =
    activeCount === capabilityValues.length
      ? "configured"
      : activeCount > 0
        ? "partial"
        : "failed";
  const finished = await repository.finishOlxWebhookSetup({
    connectionId: connection.id,
    leaseOwner,
    metadata: {
      webhookSetup: {
        attemptCount: readRecord(claimed.metadata.webhookSetup).attemptCount,
        capabilities,
        failures,
        configuredAt: activeCount ? new Date().toISOString() : null,
        lastErrorCode:
          errorCount > 0
            ? "registration_failed"
            : activeCount < capabilityValues.length
              ? "scope_missing"
              : null,
        leaseExpiresAt: null,
        leaseOwner: null,
        status: setupStatus,
      },
    },
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  assertFinishedOlxSetup(finished, setupStatus);
  const result = buildOlxOnboardingResult(connection.id, capabilities);
  if (
    result.capabilities.chat.status === "active" &&
    ports.crmRoutingConnectionRepository &&
    ports.crmRoutingPolicyRepository
  ) {
    await ensureFirstReadyChannelDefault(
      context,
      { channel: "olx_chat", connectionId: connection.id },
      ports,
    );
  }
  await recordOlxOnboardingOutcome(context, input, result);
  return result;
}
