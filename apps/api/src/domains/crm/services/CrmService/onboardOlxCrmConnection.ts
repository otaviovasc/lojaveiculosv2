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
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "./serviceSupport.js";
import { getCrmConnectionRepository } from "./serviceSupport.js";
import { getCrmConnectionCredentialVault } from "./crmConnectionSetupSupport.js";

const permission = "crm.messaging.connection.setup" as const;

export async function onboardOlxCrmConnection(
  context: ServiceContext,
  input: {
    accessToken: string;
    canonicalApiOrigin: string;
    providerAccountId: string | null;
    storeId: string;
    tenantId: string;
  },
  ports: CrmServicePorts,
) {
  assertPermission(context, permission);
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
  const repository = getCrmConnectionRepository(ports);
  const vault = getCrmConnectionCredentialVault(ports);
  const provider = ports.olxCrmWebhookSetupProvider;
  if (
    !provider ||
    !repository.claimOlxWebhookSetup ||
    !repository.finishOlxWebhookSetup
  )
    throw new Error("OLX CRM onboarding is unavailable.");
  const existing = (
    await repository.listConnections({
      providers: ["olx_chat"],
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    })
  )[0];
  const stored = readRecord(existing?.credentialsRef.stored);
  const webhookSecret =
    typeof stored.webhookSecret === "string" && stored.webhookSecret.trim()
      ? stored.webhookSecret
      : await vault.seal({
          plaintext: randomBytes(32).toString("base64url"),
          purpose: OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
          storeId: input.storeId as never,
          tenantId: input.tenantId as never,
        });
  const accessToken = await vault.seal({
    plaintext: input.accessToken,
    purpose: OLX_ACCESS_TOKEN_CREDENTIAL_PURPOSE,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  const connection = await repository.upsertOlxConnection({
    credentialsRef: { stored: { accessToken, webhookSecret } },
    displayName: "OLX Chat",
    externalConnectionId: input.providerAccountId,
    metadata: existing?.metadata ?? {},
    status: existing?.status === "active" ? "active" : "error",
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    webhookUrl: existing?.webhookUrl ?? null,
  });
  await repository.updateConnection({
    connectionId: connection.id,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
    webhookUrl: `${input.canonicalApiOrigin}/api/v1/crm/whatsapp/webhooks/olx/${connection.id}/received`,
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
  if (!claimed)
    return {
      connectionId: connection.id,
      status:
        connection.status === "active"
          ? ("active" as const)
          : ("error" as const),
    };
  const secret = await vault.open({
    purpose: OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
    sealed: webhookSecret,
    storeId: input.storeId as never,
    tenantId: input.tenantId as never,
  });
  const base = `${input.canonicalApiOrigin}/api/v1/crm/whatsapp/webhooks/olx/${connection.id}`;
  try {
    await provider.configureLeads({
      accessToken: input.accessToken,
      callbackUrl: `${base}/leads?token=${encodeURIComponent(secret)}`,
      token: secret,
    });
    await provider.configureChat({
      accessToken: input.accessToken,
      callbackUrl: `${base}/received?token=${encodeURIComponent(secret)}`,
    });
    const finished = await repository.finishOlxWebhookSetup({
      connectionId: connection.id,
      leaseOwner,
      metadata: {
        webhookSetup: {
          attemptCount: readRecord(claimed.metadata.webhookSetup).attemptCount,
          configuredAt: new Date().toISOString(),
          leaseExpiresAt: null,
          leaseOwner: null,
          status: "configured",
        },
      },
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    });
    assertConfigured(finished);
    await audit(context, connection.id, input, "succeeded");
    return { connectionId: connection.id, status: finished.status };
  } catch (error) {
    const failed = await repository.finishOlxWebhookSetup({
      connectionId: connection.id,
      leaseOwner,
      metadata: {
        webhookSetup: {
          attemptCount: readRecord(claimed.metadata.webhookSetup).attemptCount,
          lastErrorCode: "registration_failed",
          leaseExpiresAt: null,
          leaseOwner: null,
          status: "failed",
        },
      },
      storeId: input.storeId as never,
      tenantId: input.tenantId as never,
    });
    await audit(context, connection.id, input, "failed");
    assertFailed(failed, error);
    throw error;
  }
}

function assertConfigured(
  connection: CrmConnection | null,
): asserts connection is NonNullable<typeof connection> & { status: "active" } {
  if (
    !connection ||
    connection.status !== "active" ||
    readRecord(connection.metadata.webhookSetup).status !== "configured"
  ) {
    throw setupLeaseLost();
  }
}

function assertFailed(
  connection: CrmConnection | null,
  cause: unknown,
): asserts connection is NonNullable<typeof connection> & { status: "error" } {
  if (
    !connection ||
    connection.status !== "error" ||
    readRecord(connection.metadata.webhookSetup).status !== "failed"
  ) {
    throw setupLeaseLost(cause);
  }
}

function setupLeaseLost(cause?: unknown) {
  return new Error("OLX webhook setup lease was lost before completion.", {
    ...(cause === undefined ? {} : { cause }),
  });
}

async function audit(
  context: ServiceContext,
  connectionId: string,
  input: { storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
) {
  await context.audit.record({
    action: "crm.connection.olx.onboard",
    actor: context.actor,
    category: "integration",
    entityId: connectionId,
    entityType: "crm_connection",
    metadata: { permission, provider: "olx_chat" },
    outcome,
    requestId: context.requestId,
    storeId: input.storeId,
    tenantId: input.tenantId,
    summary: "Configured OLX CRM connection",
  });
}
function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
