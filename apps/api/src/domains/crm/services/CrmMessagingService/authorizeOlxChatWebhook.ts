import { createHash, timingSafeEqual } from "node:crypto";
import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE } from "../../ports/crmOlxCredentials.js";
import { CrmOlxWebhookSecurityUnavailableError } from "../../ports/crmOlxWebhookSecurity.js";
import {
  getCrmConnectionRepository,
  getCrmOlxWebhookSecurity,
  isCrmOlxChatEnabled,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";

const permission = "crm.messages.ingest" as const;
// 32 random bytes encoded as base64url produce 43 characters.
const minimumWebhookSecretLength = 43;
declare const olxWebhookAuthorizationBrand: unique symbol;
const issuedCapabilities = new WeakSet<object>();
const consumedCapabilities = new WeakSet<object>();

export type OlxWebhookAuthorization = Readonly<{
  [olxWebhookAuthorizationBrand]: true;
  connectionId: string;
  storeId: string;
  tenantId: string;
}>;

export class OlxWebhookRejectedError extends Error {
  readonly status: 400 | 409 | 429 | 503;

  constructor(message: string, status: 400 | 409 | 429 | 503) {
    super(message);
    this.name = "OlxWebhookRejectedError";
    this.status = status;
  }
}

export async function authorizeOlxChatWebhook(
  context: ServiceContext,
  input: {
    connectionId: string;
    sourceFingerprint: string;
    token: string | null;
  },
  ports: CrmServicePorts,
) {
  assertPermission(context, permission);
  if (!isCrmOlxChatEnabled(ports)) throw denied();
  logCrmServiceEvent(context, "crm.provider.olx.webhook.authorize.started", {
    connectionId: input.connectionId,
    provider: "olx",
  });
  const security = getCrmOlxWebhookSecurity(ports);
  const now = security.now();
  try {
    if (
      !(await consumeLimit(security, {
        now,
        scope: "unauthenticated",
        sourceFingerprint: input.sourceFingerprint,
      }))
    ) {
      throw new OlxWebhookRejectedError(
        "OLX Chat webhook rate limit was reached.",
        429,
      );
    }
    const connection = await getCrmConnectionRepository(
      ports,
    ).findConnectionById(input.connectionId);
    if (
      !connection ||
      connection.channel !== "olx_chat" ||
      connection.provider !== "olx" ||
      connection.status === "archived" ||
      !input.token
    ) {
      throw denied();
    }
    const sealed = readString(
      readRecord(connection.credentialsRef.stored).webhookSecret,
    );
    if (!sealed) throw denied();
    let expected: string;
    try {
      expected = await getCrmConnectionCredentialVault(ports).open({
        purpose: OLX_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
        sealed,
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      });
    } catch {
      throw denied();
    }
    if (
      expected.length < minimumWebhookSecretLength ||
      !sameSecret(input.token, expected)
    ) {
      throw denied();
    }
    if (
      !(await consumeLimit(security, {
        connectionId: connection.id,
        now,
        provider: "olx",
        scope: "connection",
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      }))
    ) {
      throw new OlxWebhookRejectedError(
        "OLX Chat webhook rate limit was reached.",
        429,
      );
    }
    const authorization = Object.freeze({
      connectionId: connection.id,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    }) as unknown as OlxWebhookAuthorization;
    issuedCapabilities.add(authorization);
    return {
      authorization,
      authorized: true as const,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    };
  } catch (error) {
    await auditRejected(context, input.connectionId, rejectionReason(error));
    throw error;
  }
}

export function consumeOlxWebhookAuthorization(
  authorization: OlxWebhookAuthorization | undefined,
  connectionId: string,
) {
  if (
    !authorization ||
    !issuedCapabilities.has(authorization) ||
    consumedCapabilities.has(authorization) ||
    authorization.connectionId !== connectionId
  ) {
    throw denied();
  }
  consumedCapabilities.add(authorization);
  return {
    storeId: authorization.storeId,
    tenantId: authorization.tenantId,
  };
}

async function auditRejected(
  context: ServiceContext,
  connectionId: string,
  reason: "authorization_failed" | "rate_limited" | "security_unavailable",
) {
  await auditCrmServiceEvent(
    context,
    {
      action: "crm.messaging.webhook.olx.rejected",
      category: "data_access",
      entityId: connectionId,
      entityType: "crm_messaging_connection",
      metadata: { phase: "rejected", provider: "olx", reason },
      permission,
      summary: "Rejected OLX Chat webhook",
    },
    "failed",
  );
}

async function consumeLimit(
  security: ReturnType<typeof getCrmOlxWebhookSecurity>,
  input: Parameters<ReturnType<typeof getCrmOlxWebhookSecurity>["consume"]>[0],
) {
  try {
    return await security.consume(input);
  } catch (error) {
    if (error instanceof CrmOlxWebhookSecurityUnavailableError) {
      throw new OlxWebhookRejectedError(
        "OLX Chat webhook security is temporarily unavailable.",
        503,
      );
    }
    throw error;
  }
}

function sameSecret(received: string, expected: string) {
  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}

function rejectionReason(error: unknown) {
  if (error instanceof OlxWebhookRejectedError) {
    if (error.status === 429) return "rate_limited" as const;
    if (error.status === 503) return "security_unavailable" as const;
  }
  return "authorization_failed" as const;
}

function denied() {
  return new AuthorizationError("Invalid OLX Chat webhook token.");
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
