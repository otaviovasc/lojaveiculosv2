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
import {
  processZapiWhatsappWebhookEvent,
  type DurableZapiWebhookResult,
} from "./processZapiWhatsappWebhookEvent.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const readPermission = "crm.whatsapp.read" as const;
const retryPermission = "crm.whatsapp.send" as const;

export type ListWhatsappFailedWebhookEventsInput = {
  connectionId?: string | null;
  limit?: number;
  offset?: number;
};

export type RetryWhatsappWebhookEventInput = {
  eventId: string;
};

export type WhatsappWebhookEventSummary = {
  connectionId: string | null;
  createdAt: string;
  errorMessage: string | null;
  eventType: string;
  id: string;
  processedAt: string | null;
  providerEventId: string;
  status: CrmProviderWebhookEvent["status"];
  updatedAt: string;
  webhookType: ZapiWebhookType | null;
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

export async function listWhatsappFailedWebhookEvents(
  context: ServiceContext,
  input: ListWhatsappFailedWebhookEventsInput,
  ports: CrmServicePorts,
): Promise<readonly WhatsappWebhookEventSummary[]> {
  assertPermission(context, readPermission);
  const scope = requireCrmScope(context);
  logWhatsappServiceEvent(context, "crm.whatsapp.webhook.events.failed.list", {
    connectionId: input.connectionId ?? null,
  });
  const events = await getCrmWebhookEventRepository(ports).list({
    ...(input.connectionId ? { connectionId: input.connectionId } : {}),
    limit: input.limit ?? 20,
    offset: input.offset ?? 0,
    provider: "zapi",
    status: "failed",
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return events.map(toWebhookEventSummary);
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
  if (event.status !== "failed") {
    throw new WhatsappWebhookEventRetryError(
      "Only failed provider events can be retried.",
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
      const result = await processZapiWhatsappWebhookEvent(
        withIngestPermission(context),
        { connectionId, payload: event.payload },
        webhookType,
        readRetryProcessor(webhookType),
        ports,
      );
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

function readZapiWebhookType(eventType: string): ZapiWebhookType | null {
  const prefix = "crm.whatsapp.zapi.";
  if (!eventType.startsWith(prefix)) return null;
  const type = eventType.slice(prefix.length);
  if (
    type === "chat_presence" ||
    type === "connected" ||
    type === "delivery" ||
    type === "disconnected" ||
    type === "received" ||
    type === "status"
  ) {
    return type;
  }
  return null;
}

function withIngestPermission(context: ServiceContext): ServiceContext {
  return {
    ...context,
    permissions: [...new Set([...context.permissions, "crm.whatsapp.ingest"])],
  };
}

function toWebhookEventSummary(
  event: CrmProviderWebhookEvent,
): WhatsappWebhookEventSummary {
  return {
    connectionId: event.connectionId,
    createdAt: event.createdAt.toISOString(),
    errorMessage: event.errorMessage,
    eventType: event.eventType,
    id: event.id,
    processedAt: event.processedAt?.toISOString() ?? null,
    providerEventId: event.providerEventId,
    status: event.status,
    updatedAt: event.updatedAt.toISOString(),
    webhookType: readZapiWebhookType(event.eventType),
  };
}
