import { timingSafeEqual } from "node:crypto";
import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  getCrmOlxWebhookSecurity,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { openAcceptedZapiWebhookSecrets } from "../../whatsapp/zapiWebhookSecret.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";

const permission = "crm.messages.ingest" as const;

export async function authorizeZapiWebhook(
  context: ServiceContext,
  input: {
    connectionId: string;
    sourceFingerprint: string;
    token: string | null;
  },
  ports: CrmServicePorts,
) {
  assertPermission(context, permission);
  logCrmServiceEvent(context, "crm.provider.zapi.webhook.authorize.started", {
    connectionId: input.connectionId,
    operation: "authorize_webhook",
    provider: "zapi",
  });
  await auditAuthorization(context, input.connectionId, "attempted");
  try {
    const security = getCrmOlxWebhookSecurity(ports);
    const now = security.now();
    const connection = await getCrmConnectionRepository(
      ports,
    ).findConnectionById(input.connectionId);
    if (
      !connection ||
      connection.provider !== "zapi" ||
      connection.status === "archived" ||
      !input.token
    ) {
      return rejectUnauthenticated(security, now, input.sourceFingerprint);
    }
    let expected: string[];
    try {
      expected = await openAcceptedZapiWebhookSecrets(connection, ports, now);
    } catch {
      return rejectUnauthenticated(security, now, input.sourceFingerprint);
    }
    const receivedBuffer = Buffer.from(input.token);
    const matches = expected.reduce((matched, candidate) => {
      const candidateBuffer = Buffer.from(candidate);
      return (
        (receivedBuffer.length === candidateBuffer.length &&
          timingSafeEqual(receivedBuffer, candidateBuffer)) ||
        matched
      );
    }, false);
    if (!matches) {
      return rejectUnauthenticated(security, now, input.sourceFingerprint);
    }
    if (
      !(await security.consume({
        connectionId: connection.id,
        now,
        provider: "zapi",
        scope: "connection",
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      }))
    ) {
      throw rateLimited();
    }
    return {
      authorized: true as const,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    };
  } catch (error) {
    await auditAuthorization(context, input.connectionId, "failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw error;
  }
}

export async function completeZapiWebhookAuthorization(
  context: ServiceContext,
  input: { connectionId: string; storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  metadata: { errorName?: string; reason?: string } = {},
) {
  await auditAuthorization(context, input.connectionId, outcome, metadata, {
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  if (outcome === "succeeded") {
    logCrmServiceEvent(
      context,
      "crm.provider.zapi.webhook.authorize.completed",
      {
        connectionId: input.connectionId,
        operation: "authorize_webhook",
        provider: "zapi",
        storeId: input.storeId,
        tenantId: input.tenantId,
      },
    );
  }
}

async function auditAuthorization(
  context: ServiceContext,
  connectionId: string,
  outcome: "attempted" | "failed" | "succeeded",
  metadata: { errorName?: string; reason?: string } = {},
  scope: { storeId: string; tenantId: string } | undefined = undefined,
) {
  await auditCrmServiceEvent(
    context,
    {
      action: "crm.provider.zapi.webhook.authorize",
      category: "data_access",
      entityId: connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: { connectionId, ...metadata, provider: "zapi" },
      permission,
      ...(scope ? { storeId: scope.storeId, tenantId: scope.tenantId } : {}),
      summary: "Authorized Z-API webhook connection",
    },
    outcome,
  );
}

function denied() {
  return new AuthorizationError("Invalid CRM WhatsApp webhook token.");
}

async function rejectUnauthenticated(
  security: ReturnType<typeof getCrmOlxWebhookSecurity>,
  now: Date,
  sourceFingerprint: string,
): Promise<never> {
  const accepted = await security.consume({
    now,
    scope: "unauthenticated",
    sourceFingerprint,
  });
  throw accepted ? denied() : rateLimited();
}

function rateLimited() {
  return new CrmMessageActionError(
    "Z-API webhook rate limit was reached.",
    429,
  );
}
