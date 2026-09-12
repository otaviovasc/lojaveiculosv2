import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmProviderWebhookEvent } from "../../ports/crmWebhookEventRepository.js";
import type { ZapiWebhookType } from "../../whatsapp/zapiWebhookEventKey.js";
import {
  getCrmConnectionRepository,
  getCrmWebhookEventRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { ingestZapiWhatsappWebhook } from "../CrmWhatsappService/ingestZapiWhatsappWebhook.js";
import {
  processZapiWhatsappChatPresenceWebhook,
  processZapiWhatsappConnectedWebhook,
  processZapiWhatsappDisconnectedWebhook,
} from "../CrmWhatsappService/processZapiWhatsappConnectionWebhook.js";
import {
  processZapiWhatsappDeliveryWebhook,
  processZapiWhatsappStatusWebhook,
} from "../CrmWhatsappService/processZapiWhatsappMessageWebhook.js";
import { type DurableZapiWebhookResult } from "../CrmWhatsappService/processZapiWhatsappWebhookEvent.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  readWebhookEventAttentionReason,
  readZapiWebhookType,
  toWebhookEventSummary,
  type ProviderEventIssueSummary,
} from "../../messaging/providerEventIssues.js";
import { ProviderEventRetryError } from "../../messaging/providerEventRetryError.js";
export type { ProviderEventIssueSummary } from "../../messaging/providerEventIssues.js";
export { ProviderEventRetryError } from "../../messaging/providerEventRetryError.js";
const readPermission = "crm.conversations.read" as const;
const retryPermission = "crm.messages.send" as const;

export type ListProviderEventIssuesInput = {
  connectionId?: string | null;
  limit?: number;
  offset?: number;
};

export type RetryProviderEventInput = {
  eventId: string;
};

export type RetryProviderEventResult = {
  event: ProviderEventIssueSummary;
  result: DurableZapiWebhookResult;
};

type RetryProcessor = (
  context: ServiceContext,
  input: { connectionId: string; payload: Record<string, unknown> },
  ports: CrmServicePorts,
) => Promise<DurableZapiWebhookResult>;

export async function listProviderEventIssues(
  context: ServiceContext,
  input: ListProviderEventIssuesInput,
  ports: CrmServicePorts,
): Promise<readonly ProviderEventIssueSummary[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, "crm.provider_events.issues.list", {
    connectionId: input.connectionId ?? null,
  });
  const pageEnd = (input.offset ?? 0) + (input.limit ?? 20);
  const repository = getCrmWebhookEventRepository(ports);
  const scopeFilter = {
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  } as const;
  const [failedEvents, ignoredReceivedEvents] = await Promise.all([
    repository.list({
      ...scopeFilter,
      limit: pageEnd,
      status: "failed",
    }),
    repository.list({
      ...scopeFilter,
      eventType: "crm.provider.zapi.received",
      limit: pageEnd,
      provider: "zapi",
      status: "ignored",
    }),
  ]);
  return [...failedEvents, ...ignoredReceivedEvents]
    .filter(readWebhookEventAttentionReason)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(input.offset ?? 0, pageEnd)
    .map(toWebhookEventSummary);
}

export async function retryProviderEvent(
  context: ServiceContext,
  input: RetryProviderEventInput,
  ports: CrmServicePorts,
): Promise<RetryProviderEventResult> {
  assertPermission(context, retryPermission);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmWebhookEventRepository(ports);
  const event = await repository.findById({
    eventId: input.eventId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!event) {
    throw new ProviderEventRetryError("Provider event was not found.", 404);
  }
  if (!readWebhookEventAttentionReason(event)) {
    throw new ProviderEventRetryError(
      "Only provider event issues can be retried.",
      409,
    );
  }
  const webhookType = readZapiWebhookType(event.eventType);
  if (!webhookType) {
    throw new ProviderEventRetryError(
      "Provider event type is not retryable.",
      422,
    );
  }
  const connectionId =
    event.connectionId ?? (await resolveRetryConnectionId(event, ports));

  return recordCrmServiceMutation(
    context,
    {
      action: "crm.provider.zapi.webhook.retry",
      category: "data_change",
      entityId: event.id,
      entityType: "provider_event",
      metadata: {
        connectionId,
        providerEventId: event.providerEventId,
        webhookType,
      },
      permission: retryPermission,
      summary: "Retried failed ZAPI WhatsApp webhook event",
    },
    async () => {
      const result = await retryRecordedZapiWebhookEvent(context, {
        connectionId,
        event,
        ports,
        webhookType,
      });
      const updated = await repository.findById({
        eventId: event.id,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      return {
        event: toWebhookEventSummary(updated ?? event),
        result,
      };
    },
  );
}

function readRetryProcessor(type: ZapiWebhookType): RetryProcessor {
  const processors = {
    chat_presence: processZapiWhatsappChatPresenceWebhook,
    connected: processZapiWhatsappConnectedWebhook,
    delivery: processZapiWhatsappDeliveryWebhook,
    disconnected: processZapiWhatsappDisconnectedWebhook,
    received: ingestZapiWhatsappWebhook,
    status: processZapiWhatsappStatusWebhook,
  } satisfies Record<ZapiWebhookType, RetryProcessor>;
  return processors[type];
}

async function retryRecordedZapiWebhookEvent(
  context: ServiceContext,
  input: {
    connectionId: string;
    event: CrmProviderWebhookEvent;
    ports: CrmServicePorts;
    webhookType: ZapiWebhookType;
  },
) {
  const repository = getCrmWebhookEventRepository(input.ports);
  const processingStartedAt = new Date();
  const processingToken = randomUUID();
  const claimed = await repository.claimForProcessing({
    allowIgnored: true,
    eventId: input.event.id,
    processingStartedAt,
    processingToken,
    staleBefore: new Date(processingStartedAt.getTime() - 5 * 60 * 1_000),
  });
  if (!claimed) {
    throw new ProviderEventRetryError(
      "Provider event is already being processed or completed.",
      409,
    );
  }
  try {
    const result = await readRetryProcessor(input.webhookType)(
      withIngestPermission(context),
      { connectionId: input.connectionId, payload: input.event.payload },
      input.ports,
    );
    await repository.updateStatus({
      eventId: claimed.id,
      processingToken,
      status: result.status === "ignored" ? "ignored" : "processed",
    });
    return result;
  } catch (error) {
    await repository.updateStatus({
      errorMessage: error instanceof Error ? error.name : "UnknownError",
      eventId: claimed.id,
      processingToken,
      status: "failed",
    });
    throw error;
  }
}

async function resolveRetryConnectionId(
  event: CrmProviderWebhookEvent,
  ports: CrmServicePorts,
) {
  const connections = await getCrmConnectionRepository(ports).listConnections({
    providers: ["zapi"],
    storeId: event.storeId as never,
    tenantId: event.tenantId as never,
  });
  if (connections.length === 1) return connections[0]!.id;
  throw new ProviderEventRetryError(
    "Provider event is missing connection context.",
    409,
  );
}

function withIngestPermission(context: ServiceContext): ServiceContext {
  return {
    ...context,
    permissions: [...new Set([...context.permissions, "crm.messages.ingest"])],
  };
}
