import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmProviderWebhookEvent } from "../../ports/crmWebhookEventRepository.js";
import type { ZapiWebhookType } from "../../whatsapp/zapiWebhookEventKey.js";
import {
  getCrmConnectionRepository,
  getCrmWebhookEventRepository,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { ingestZapiWhatsappWebhook } from "./ingestZapiWhatsappWebhook.js";
import {
  processZapiWhatsappChatPresenceWebhook,
  processZapiWhatsappConnectedWebhook,
  processZapiWhatsappDisconnectedWebhook,
} from "./processZapiWhatsappConnectionWebhook.js";
import {
  processZapiWhatsappDeliveryWebhook,
  processZapiWhatsappStatusWebhook,
} from "./processZapiWhatsappMessageWebhook.js";
import { type DurableZapiWebhookResult } from "./processZapiWhatsappWebhookEvent.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  readWebhookEventAttentionReason,
  readZapiWebhookType,
  toWebhookEventSummary,
  type WhatsappWebhookEventSummary,
} from "../../whatsapp/whatsappWebhookEventIssues.js";
export type { WhatsappWebhookEventSummary } from "../../whatsapp/whatsappWebhookEventIssues.js";

const readPermission = "crm.whatsapp.read" as const;
const retryPermission = "crm.whatsapp.send" as const;

export type ListWhatsappWebhookEventIssuesInput = {
  connectionId?: string | null;
  limit?: number;
  offset?: number;
};

export type RetryWhatsappWebhookEventInput = {
  eventId: string;
};

export type RetryWhatsappWebhookEventResult = {
  event: WhatsappWebhookEventSummary;
  result: DurableZapiWebhookResult;
};

type RetryProcessor = (
  context: ServiceContext,
  input: { connectionId: string; payload: Record<string, unknown> },
  ports: CrmServicePorts,
) => Promise<DurableZapiWebhookResult>;

export async function listWhatsappWebhookEventIssues(
  context: ServiceContext,
  input: ListWhatsappWebhookEventIssuesInput,
  ports: CrmServicePorts,
): Promise<readonly WhatsappWebhookEventSummary[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmScope(context);
  logWhatsappServiceEvent(context, "crm.whatsapp.webhook.events.issues.list", {
    connectionId: input.connectionId ?? null,
  });
  const pageEnd = (input.offset ?? 0) + (input.limit ?? 20);
  const repository = getCrmWebhookEventRepository(ports);
  const scopeFilter = {
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    provider: "zapi",
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
      eventType: "crm.whatsapp.zapi.received",
      limit: pageEnd,
      status: "ignored",
    }),
  ]);
  return [...failedEvents, ...ignoredReceivedEvents]
    .filter(readWebhookEventAttentionReason)
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(input.offset ?? 0, pageEnd)
    .map(toWebhookEventSummary);
}

export async function retryWhatsappWebhookEvent(
  context: ServiceContext,
  input: RetryWhatsappWebhookEventInput,
  ports: CrmServicePorts,
): Promise<RetryWhatsappWebhookEventResult> {
  assertPermission(context, retryPermission);
  const scope = requireCrmScope(context);
  const repository = getCrmWebhookEventRepository(ports);
  const event = await repository.findById({
    eventId: input.eventId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!event) {
    throw new WhatsappWebhookEventRetryError(
      "Provider event was not found.",
      404,
    );
  }
  if (!readWebhookEventAttentionReason(event)) {
    throw new WhatsappWebhookEventRetryError(
      "Only provider event issues can be retried.",
      409,
    );
  }
  const webhookType = readZapiWebhookType(event.eventType);
  if (!webhookType) {
    throw new WhatsappWebhookEventRetryError(
      "Provider event type is not retryable.",
      422,
    );
  }
  const connectionId =
    event.connectionId ?? (await resolveRetryConnectionId(event, ports));

  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.webhook.zapi.retry",
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

export class WhatsappWebhookEventRetryError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409 | 422,
  ) {
    super(message);
    this.name = "WhatsappWebhookEventRetryError";
  }
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
  try {
    const result = await readRetryProcessor(input.webhookType)(
      withIngestPermission(context),
      { connectionId: input.connectionId, payload: input.event.payload },
      input.ports,
    );
    await repository.updateStatus({
      eventId: input.event.id,
      status: result.status === "ignored" ? "ignored" : "processed",
    });
    return result;
  } catch (error) {
    await repository.updateStatus({
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      eventId: input.event.id,
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
  throw new WhatsappWebhookEventRetryError(
    "Provider event is missing connection context.",
    409,
  );
}

function withIngestPermission(context: ServiceContext): ServiceContext {
  return {
    ...context,
    permissions: [...new Set([...context.permissions, "crm.whatsapp.ingest"])],
  };
}
