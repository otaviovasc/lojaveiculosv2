import {
  assertEntitlement,
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  buildOlxLeadProviderReference,
  createOlxLeadReceiptPayload,
  olxLeadReceiptEventType,
  sealOlxLeadReceiptPayload,
} from "../../messaging/olxLeadReceipt.js";
import { parseOlxLeadWebhook } from "../../messaging/parseOlxLeadWebhook.js";
import {
  getCrmConnectionRepository,
  getCrmEnvironment,
  getCrmWebhookEventRepository,
  isCrmOlxChatEnabled,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "../CrmWhatsapp/serviceSupport.js";
import {
  consumeOlxWebhookAuthorization,
  OlxWebhookRejectedError,
  type OlxWebhookAuthorization,
} from "./authorizeOlxChatWebhook.js";

const permission = "crm.whatsapp.ingest" as const;

export type IngestOlxLeadWebhookResult = {
  responseId: string;
  status: "accepted" | "duplicate";
};

export async function ingestOlxLeadWebhook(
  context: ServiceContext,
  input: {
    authorization: OlxWebhookAuthorization;
    connectionId: string;
    entitlementGranted: boolean;
    payload: Record<string, unknown>;
  },
  ports: CrmServicePorts,
): Promise<IngestOlxLeadWebhookResult> {
  assertPermission(context, permission);
  if (!isCrmOlxChatEnabled(ports)) throw denied();
  const authorizedScope = consumeOlxWebhookAuthorization(
    input.authorization,
    input.connectionId,
  );
  if (!input.entitlementGranted) {
    await auditRejected(context, input.connectionId, "crm_entitlement_missing");
    throw denied();
  }
  const scope = requireCrmWhatsappScope(context);
  const scopedContext = context as StoreScopedServiceContext;
  if (!scopedContext.entitlements.includes("crm")) {
    await auditRejected(context, input.connectionId, "crm_entitlement_missing");
    throw denied();
  }
  assertEntitlement(scopedContext, "crm");
  if (
    scope.storeId !== authorizedScope.storeId ||
    scope.tenantId !== authorizedScope.tenantId
  ) {
    await auditRejected(context, input.connectionId, "scope_mismatch");
    throw denied();
  }
  const parsed = parseOlxLeadWebhook(input.payload);
  if (!parsed) {
    await auditRejected(context, input.connectionId, "invalid_payload");
    throw new OlxWebhookRejectedError("OLX lead webhook was rejected.", 400);
  }
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (
    !connection ||
    connection.provider !== "olx_chat" ||
    !["active", "sandbox"].includes(connection.status) ||
    connection.storeId !== scope.storeId ||
    connection.tenantId !== scope.tenantId
  ) {
    await auditRejected(context, input.connectionId, "connection_unavailable");
    throw denied();
  }
  const receipt = createOlxLeadReceiptPayload(connection.id, parsed);
  const sealedReceipt = await sealOlxLeadReceiptPayload(
    getCrmConnectionCredentialVault(ports),
    {
      connectionId: connection.id,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    },
    receipt,
  );
  const recorded = await getCrmWebhookEventRepository(ports).recordReceived({
    connectionId: connection.id,
    environment: getCrmEnvironment(ports),
    eventType: olxLeadReceiptEventType,
    payload: sealedReceipt,
    provider: "olx_chat",
    providerEventId: buildOlxLeadProviderReference(receipt.identityKey),
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  context.logger.info("crm.lead.webhook.olx.received", {
    connectionId: connection.id,
    duplicate: !recorded.created,
    provider: "olx",
    providerEventId: recorded.event.id,
    requestId: context.requestId,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  return {
    responseId: recorded.event.id,
    status: recorded.created ? "accepted" : "duplicate",
  };
}

function denied() {
  return new AuthorizationError("Invalid OLX webhook token.");
}

async function auditRejected(
  context: ServiceContext,
  connectionId: string,
  reason:
    | "connection_unavailable"
    | "crm_entitlement_missing"
    | "invalid_payload"
    | "scope_mismatch",
) {
  logWhatsappServiceEvent(context, "crm.lead.webhook.olx.rejected", {
    connectionId,
    provider: "olx",
    reason,
  });
  await auditWhatsappServiceEvent(
    context,
    {
      action: "crm.lead.webhook.olx.rejected",
      category: "data_change",
      entityId: connectionId,
      entityType: "crm_messaging_connection",
      metadata: { provider: "olx", reason },
      permission,
      summary: "Rejected OLX lead webhook",
    },
    "failed",
  );
}
