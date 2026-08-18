import { timingSafeEqual } from "node:crypto";
import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmConnectionRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { openZapiWebhookSecret } from "../../whatsapp/zapiWebhookSecret.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";

const permission = "crm.messages.ingest" as const;

export async function authorizeZapiWebhook(
  context: ServiceContext,
  input: { connectionId: string; token: string | null },
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
    const connection = await getCrmConnectionRepository(
      ports,
    ).findConnectionById(input.connectionId);
    if (
      !connection ||
      connection.provider !== "zapi" ||
      connection.status === "archived" ||
      !input.token
    ) {
      throw denied();
    }
    let expected: string;
    try {
      expected = await openZapiWebhookSecret(connection, ports);
    } catch {
      throw denied();
    }
    const receivedBuffer = Buffer.from(input.token);
    const expectedBuffer = Buffer.from(expected);
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw denied();
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
