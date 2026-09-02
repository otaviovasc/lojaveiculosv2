import { timingSafeEqual } from "node:crypto";
import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import {
  getCrmConnectionRepository,
  getCrmOlxWebhookSecurity,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";

const permission = "crm.messages.ingest" as const;

export type WhatsappWebhookAuthorizationProvider = {
  openAcceptedSecrets: (
    connection: CrmConnection,
    ports: CrmServicePorts,
    now: Date,
  ) => Promise<string[]>;
  provider: "uazapi" | "zapi";
  rateLimitedMessage: string;
  summary: string;
};

export async function authorizeWhatsappWebhook(
  providerConfig: WhatsappWebhookAuthorizationProvider,
  context: ServiceContext,
  input: {
    connectionId: string;
    sourceFingerprint: string;
    token: string | null;
  },
  ports: CrmServicePorts,
) {
  assertPermission(context, permission);
  logCrmServiceEvent(
    context,
    `crm.provider.${providerConfig.provider}.webhook.authorize.started`,
    {
      connectionId: input.connectionId,
      operation: "authorize_webhook",
      provider: providerConfig.provider,
    },
  );
  await auditAuthorization(
    providerConfig,
    context,
    input.connectionId,
    "attempted",
  );
  try {
    const security = getCrmOlxWebhookSecurity(ports);
    const now = security.now();
    const connection = await getCrmConnectionRepository(
      ports,
    ).findConnectionById(input.connectionId);
    if (
      !connection ||
      connection.provider !== providerConfig.provider ||
      connection.status === "archived" ||
      !input.token
    ) {
      return rejectUnauthenticated(
        providerConfig,
        security,
        now,
        input.sourceFingerprint,
      );
    }
    let expected: string[];
    try {
      expected = await providerConfig.openAcceptedSecrets(
        connection,
        ports,
        now,
      );
    } catch {
      return rejectUnauthenticated(
        providerConfig,
        security,
        now,
        input.sourceFingerprint,
      );
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
      return rejectUnauthenticated(
        providerConfig,
        security,
        now,
        input.sourceFingerprint,
      );
    }
    if (
      !(await security.consume({
        connectionId: connection.id,
        now,
        provider: providerConfig.provider,
        scope: "connection",
        storeId: connection.storeId,
        tenantId: connection.tenantId,
      }))
    ) {
      throw rateLimited(providerConfig);
    }
    return {
      authorized: true as const,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    };
  } catch (error) {
    await auditAuthorization(
      providerConfig,
      context,
      input.connectionId,
      "failed",
      {
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    );
    throw error;
  }
}

export async function completeWhatsappWebhookAuthorization(
  providerConfig: WhatsappWebhookAuthorizationProvider,
  context: ServiceContext,
  input: { connectionId: string; storeId: string; tenantId: string },
  outcome: "failed" | "succeeded",
  metadata: { errorName?: string; reason?: string } = {},
) {
  await auditAuthorization(
    providerConfig,
    context,
    input.connectionId,
    outcome,
    metadata,
    {
      storeId: input.storeId,
      tenantId: input.tenantId,
    },
  );
  if (outcome === "succeeded") {
    logCrmServiceEvent(
      context,
      `crm.provider.${providerConfig.provider}.webhook.authorize.completed`,
      {
        connectionId: input.connectionId,
        operation: "authorize_webhook",
        provider: providerConfig.provider,
        storeId: input.storeId,
        tenantId: input.tenantId,
      },
    );
  }
}

async function auditAuthorization(
  providerConfig: WhatsappWebhookAuthorizationProvider,
  context: ServiceContext,
  connectionId: string,
  outcome: "attempted" | "failed" | "succeeded",
  metadata: { errorName?: string; reason?: string } = {},
  scope: { storeId: string; tenantId: string } | undefined = undefined,
) {
  await auditCrmServiceEvent(
    context,
    {
      action: `crm.provider.${providerConfig.provider}.webhook.authorize`,
      category: "data_access",
      entityId: connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: {
        connectionId,
        ...metadata,
        provider: providerConfig.provider,
      },
      permission,
      ...(scope ? { storeId: scope.storeId, tenantId: scope.tenantId } : {}),
      summary: providerConfig.summary,
    },
    outcome,
  );
}

function denied() {
  return new AuthorizationError("Invalid CRM WhatsApp webhook token.");
}

async function rejectUnauthenticated(
  providerConfig: WhatsappWebhookAuthorizationProvider,
  security: ReturnType<typeof getCrmOlxWebhookSecurity>,
  now: Date,
  sourceFingerprint: string,
): Promise<never> {
  const accepted = await security.consume({
    now,
    scope: "unauthenticated",
    sourceFingerprint,
  });
  throw accepted ? denied() : rateLimited(providerConfig);
}

function rateLimited(providerConfig: WhatsappWebhookAuthorizationProvider) {
  return new CrmMessageActionError(providerConfig.rateLimitedMessage, 429);
}
