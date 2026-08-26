import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  getCrmEnvironment,
  getCrmWebhookEventRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  buildZapiProviderEventId,
  type ZapiWebhookType,
} from "../../whatsapp/zapiWebhookEventKey.js";
import {
  auditCrmServiceEvent,
  logCrmServiceEvent,
  readZapiConnection,
  type ZapiWebhookInput,
  type ZapiWebhookResult,
} from "../CrmMessagingService/serviceSupport.js";
import type { IngestZapiWhatsappWebhookResult } from "./ingestZapiWhatsappWebhook.js";

const permission = "crm.messages.ingest" as const;
const processingLeaseMs = 5 * 60 * 1_000;

export type DurableZapiWebhookResult =
  IngestZapiWhatsappWebhookResult | ZapiWebhookResult;

export async function processZapiWhatsappWebhookEvent<
  Result extends DurableZapiWebhookResult,
>(
  context: ServiceContext,
  input: ZapiWebhookInput,
  type: ZapiWebhookType,
  process: (
    context: ServiceContext,
    input: ZapiWebhookInput,
    ports: CrmServicePorts,
  ) => Promise<Result>,
  ports: CrmServicePorts,
): Promise<Result> {
  assertPermission(context, permission);
  logCrmServiceEvent(context, "crm.provider.zapi.webhook.record.started", {
    connectionId: input.connectionId,
    webhookType: type,
  });
  const connection = await readZapiConnection(
    context,
    input.connectionId,
    ports,
  );
  const repository = getCrmWebhookEventRepository(ports);
  const providerEventId = buildZapiProviderEventId({
    connectionId: input.connectionId,
    payload: input.payload,
    type,
  });
  const recorded = await repository.recordReceived({
    connectionId: input.connectionId,
    environment: getCrmEnvironment(ports),
    eventType: `crm.provider.zapi.${type}`,
    payload: input.payload,
    provider: "zapi",
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
      action: "crm.provider.zapi.webhook.duplicate",
      category: "data_change",
      entityId: connection?.id ?? input.connectionId,
      entityType: "crm_whatsapp_connection",
      metadata: { providerEventId, webhookType: type },
      permission,
      summary: "Skipped duplicate ZAPI WhatsApp webhook",
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
      },
      processingToken,
      status: result.status === "ignored" ? "ignored" : "processed",
    });
    return result;
  } catch (error) {
    await auditCrmServiceEvent(
      context,
      {
        action: "crm.provider.zapi.webhook.failed",
        category: "data_change",
        entityId: connection?.id ?? input.connectionId,
        entityType: "crm_whatsapp_connection",
        metadata: {
          errorName: error instanceof Error ? error.name : "UnknownError",
          providerEventId,
          webhookType: type,
        },
        permission,
        summary: "Failed ZAPI WhatsApp webhook processing",
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
