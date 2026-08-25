import { randomUUID } from "node:crypto";
import {
  assertPermission,
  AuthorizationError,
} from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { parseOlxChatWebhook } from "../../messaging/parseOlxChatWebhook.js";
import { digestOlxChatWebhook } from "../../messaging/olxChatWebhookDigest.js";
import {
  buildOlxProviderEventReference,
  getOlxWebhookFreshnessRejectionReason,
} from "../../messaging/olxChatWebhookSecuritySupport.js";
import { persistOlxChatWebhook } from "../../messaging/persistOlxChatWebhook.js";
import type {
  CrmConversationCycle,
  CrmMessage,
} from "../../ports/crmConversationRepository.js";
import {
  getCrmConnectionRepository,
  getCrmEnvironment,
  getCrmOlxWebhookSecurity,
  getCrmWebhookEventRepository,
  isCrmOlxChatEnabled,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
} from "../CrmMessagingService/serviceSupport.js";
import {
  consumeOlxWebhookAuthorization,
  OlxWebhookRejectedError,
  type OlxWebhookAuthorization,
} from "./authorizeOlxChatWebhook.js";
import {
  assertOlxWebhookEffectsDelivered,
  deliverOlxWebhookEffects,
} from "../../messaging/olxWebhookEffectOutbox.js";
const permission = "crm.messages.ingest" as const;

export type IngestOlxChatWebhookResult =
  | { reason: "connection_not_found" | "non_buyer_message"; status: "ignored" }
  | { eventId: string; status: "duplicate" }
  | {
      message: CrmMessage;
      conversationCycle: CrmConversationCycle;
      status: "duplicate" | "stored";
    };

export async function ingestOlxChatWebhook(
  context: ServiceContext,
  input: {
    authorization: OlxWebhookAuthorization;
    connectionId: string;
    entitlementGranted: boolean;
    payload: Record<string, unknown>;
  },
  ports: CrmServicePorts,
): Promise<IngestOlxChatWebhookResult> {
  assertPermission(context, permission);
  if (!isCrmOlxChatEnabled(ports)) {
    throw new AuthorizationError("Invalid OLX Chat webhook token.");
  }
  const authorizedScope = consumeOlxWebhookAuthorization(
    input.authorization,
    input.connectionId,
  );
  if (!input.entitlementGranted) {
    await auditPhase(context, input.connectionId, authorizedScope, "rejected", {
      reason: "entitlement_missing",
    });
    throw new AuthorizationError("Invalid OLX Chat webhook token.");
  }
  const parsed = parseOlxChatWebhook(input.payload);
  if (!parsed) {
    await auditPhase(context, input.connectionId, authorizedScope, "rejected", {
      reason: "invalid_payload",
    });
    throw new OlxWebhookRejectedError("OLX Chat webhook was rejected.", 400);
  }
  const freshnessReason = getOlxWebhookFreshnessRejectionReason(
    parsed.timestamp,
    getCrmOlxWebhookSecurity(ports),
  );
  if (freshnessReason) {
    await auditPhase(context, input.connectionId, authorizedScope, "rejected", {
      reason: freshnessReason,
    });
    throw new OlxWebhookRejectedError("OLX Chat webhook was rejected.", 400);
  }
  logCrmServiceEvent(context, "crm.messaging.webhook.olx.received", {
    connectionId: input.connectionId,
    provider: "olx",
  });
  const connection = await getCrmConnectionRepository(ports).findConnectionById(
    input.connectionId,
  );
  if (
    !connection ||
    connection.channel !== "olx_chat" ||
    connection.provider !== "olx" ||
    (connection.status !== "active" && connection.status !== "sandbox")
  ) {
    await auditPhase(context, input.connectionId, authorizedScope, "ignored", {
      reason: "connection_unavailable",
    });
    return { reason: "connection_not_found", status: "ignored" };
  }
  if (
    connection.storeId !== authorizedScope.storeId ||
    connection.tenantId !== authorizedScope.tenantId
  ) {
    throw new AuthorizationError("Invalid OLX Chat webhook token.");
  }
  const providerEventReference = buildOlxProviderEventReference(
    parsed.externalMessageId,
  );
  const eventRepository = getCrmWebhookEventRepository(ports);
  const recorded = await eventRepository.recordReceived({
    connectionId: connection.id,
    environment: getCrmEnvironment(ports),
    eventType: "crm.messaging.olx.received",
    payload: { schemaVersion: 1 },
    payloadDigest: digestOlxChatWebhook(parsed),
    provider: "olx",
    providerEventId: providerEventReference,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
  });
  if (recorded.divergentReplay) {
    context.logger.warn("crm.messaging.webhook.olx.replay_conflict", {
      connectionId: connection.id,
      provider: "olx",
      providerEventId: providerEventReference,
      requestId: context.requestId,
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    await auditPhase(context, connection.id, authorizedScope, "rejected", {
      providerEventId: providerEventReference,
      reason: "divergent_replay",
    });
    throw new OlxWebhookRejectedError(
      "OLX Chat webhook replay conflicts with the original event.",
      409,
    );
  }
  const processingStartedAt = new Date();
  const processingToken = randomUUID();
  const claimed = await eventRepository.claimForProcessing({
    eventId: recorded.event.id,
    processingStartedAt,
    processingToken,
    staleBefore: new Date(processingStartedAt.getTime() - 5 * 60 * 1_000),
  });
  if (!claimed) {
    await assertOlxWebhookEffectsDelivered(eventRepository, recorded.event.id);
    await auditPhase(context, connection.id, authorizedScope, "ignored", {
      providerEventId: providerEventReference,
      reason: "replay",
    });
    return { eventId: recorded.event.id, status: "duplicate" };
  }
  if (parsed.origin !== "buyer") {
    await eventRepository.updateStatus({
      eventId: claimed.id,
      processingToken,
      status: "ignored",
    });
    await auditPhase(context, connection.id, authorizedScope, "ignored", {
      providerEventId: providerEventReference,
      reason: "non_buyer_message",
    });
    return { reason: "non_buyer_message", status: "ignored" };
  }

  try {
    const result = await persistOlxChatWebhook(context, ports, {
      connection,
      parsed,
      providerEventId: claimed.id,
    });
    await deliverOlxWebhookEffects(
      context,
      {
        connection,
        message: result.message,
        providerEventId: claimed.id,
        providerEventReference,
        conversationCycle: result.conversationCycle,
      },
      ports,
    );
    await eventRepository.updateStatus({
      eventId: claimed.id,
      processingToken,
      status: "processed",
    });
    return {
      message: result.message,
      conversationCycle: result.conversationCycle,
      status: result.createdMessage ? "stored" : "duplicate",
    };
  } catch (error) {
    await eventRepository.updateStatus({
      errorMessage: error instanceof Error ? error.name : "UnknownError",
      eventId: claimed.id,
      processingToken,
      status: "failed",
    });
    throw error;
  }
}

async function auditPhase(
  context: ServiceContext,
  connectionId: string,
  scope: { storeId: string; tenantId: string },
  phase: "ignored" | "rejected",
  metadata: { providerEventId?: string; reason: string },
) {
  await auditCrmServiceEvent(
    context,
    {
      action: `crm.messaging.webhook.olx.${phase}`,
      category: "data_change",
      entityId: connectionId,
      entityType: "crm_messaging_connection",
      metadata: { ...metadata, phase, provider: "olx" },
      permission,
      storeId: scope.storeId,
      summary: `${phase === "ignored" ? "Ignored" : "Rejected"} OLX Chat webhook`,
      tenantId: scope.tenantId,
    },
    phase === "rejected" ? "failed" : "succeeded",
  );
}
