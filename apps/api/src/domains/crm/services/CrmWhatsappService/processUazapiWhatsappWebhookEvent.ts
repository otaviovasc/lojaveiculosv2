import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmEnvironment,
  getCrmWebhookEventRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  buildUazapiProviderEventId,
  type UazapiWebhookType,
} from "../../whatsapp/uazapiWebhookEventKey.js";
import { auditCrmServiceEvent } from "../CrmMessagingService/serviceSupport.js";
import {
  readUazapiConnection,
  type UazapiWebhookInput,
  type UazapiWebhookResult,
} from "./uazapiWebhookSupport.js";
import type { IngestUazapiWhatsappWebhookResult } from "./ingestUazapiWhatsappWebhook.js";

const permission = "crm.messages.ingest" as const;
const processingLeaseMs = 5 * 60 * 1_000;

export type DurableUazapiWebhookResult =
  IngestUazapiWhatsappWebhookResult | UazapiWebhookResult;

export async function processUazapiWhatsappWebhookEvent<
  Result extends DurableUazapiWebhookResult,
>(
  context: ServiceContext,
  input: UazapiWebhookInput,
  type: UazapiWebhookType,
  process: (
    context: ServiceContext,
    input: UazapiWebhookInput,
    ports: CrmServicePorts,
  ) => Promise<Result>,
  ports: CrmServicePorts,
): Promise<Result> {
  assertPermission(context, permission);
  const connection = await readUazapiConnection(
    context,
    input.connectionId,
    ports,
  );
  const repository = getCrmWebhookEventRepository(ports);
  const providerEventId = buildUazapiProviderEventId({
    connectionId: input.connectionId,
    payload: input.payload,
    type,
  });
  const recorded = await repository.recordReceived({
    connectionId: input.connectionId,
    environment: getCrmEnvironment(ports),
    eventType: `crm.provider.uazapi.${type}`,
    payload: input.payload,
    provider: "uazapi",
    providerEventId,
    storeId: connection?.storeId ?? null,
    tenantId: connection?.tenantId ?? null,
  });
  const processingStartedAt = new Date();
  const processingToken = randomUUID();
  const claimed = await repository.claimForProcessing({
    eventId: recorded.event.id,
    processingStartedAt,
    processingToken,
    staleBefore: new Date(processingStartedAt.getTime() - processingLeaseMs),
  });

  if (!claimed) {
    await auditCrmServiceEvent(context, {
      action: "crm.provider.uazapi.webhook.duplicate",
      category: "data_change",
      entityId: connection?.id ?? input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: { providerEventId, webhookType: type },
      permission,
      summary: "Skipped duplicate Uazapi WhatsApp webhook",
      ...(connection
        ? { storeId: connection.storeId, tenantId: connection.tenantId }
        : {}),
    });
    return { eventId: recorded.event.id, status: "duplicate" } as Result;
  }

  try {
    const result = await process(context, input, ports);
    await repository.updateStatus({
      eventId: claimed.id,
      payload: {
        retention: "minimized_after_processing",
        webhookType: type,
        ...(result.status === "ignored" ? { reason: result.reason } : {}),
      },
      processingToken,
      status: result.status === "ignored" ? "ignored" : "processed",
    });
    return result;
  } catch (error) {
    await auditCrmServiceEvent(
      context,
      {
        action: "crm.provider.uazapi.webhook.failed",
        category: "data_change",
        entityId: connection?.id ?? input.connectionId,
        entityType: "crm_whatsapp_connection",
        metadata: {
          errorName: error instanceof Error ? error.name : "UnknownError",
          providerEventId,
          webhookType: type,
        },
        permission,
        summary: "Failed Uazapi WhatsApp webhook processing",
        ...(connection
          ? { storeId: connection.storeId, tenantId: connection.tenantId }
          : {}),
      },
      "failed",
    );
    await repository.updateStatus({
      errorMessage: error instanceof Error ? error.name : "UnknownError",
      eventId: claimed.id,
      processingToken,
      status: "failed",
    });
    throw error;
  }
}
