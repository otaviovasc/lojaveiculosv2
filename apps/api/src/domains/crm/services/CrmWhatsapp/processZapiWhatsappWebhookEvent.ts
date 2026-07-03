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
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
  readZapiConnection,
  type ZapiWebhookInput,
  type ZapiWebhookResult,
} from "./serviceSupport.js";
import type { IngestZapiWhatsappWebhookResult } from "./ingestZapiWhatsappWebhook.js";

const permission = "crm.whatsapp.ingest" as const;

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
  logWhatsappServiceEvent(context, "crm.whatsapp.webhook.zapi.record.started", {
    connectionId: input.connectionId,
    webhookType: type,
  });
  const connection = await readZapiConnection(input.connectionId, ports);
  const repository = getCrmWebhookEventRepository(ports);
  const providerEventId = buildZapiProviderEventId({
    connectionId: input.connectionId,
    payload: input.payload,
    type,
  });
  const recorded = await repository.recordReceived({
    connectionId: input.connectionId,
    environment: getCrmEnvironment(ports),
    eventType: `crm.whatsapp.zapi.${type}`,
    payload: input.payload,
    provider: "zapi",
    providerEventId,
    storeId: connection?.storeId ?? null,
    tenantId: connection?.tenantId ?? null,
  });

  if (!recorded.created && recorded.event.status !== "failed") {
    await auditWhatsappServiceEvent(context, {
      action: "crm.whatsapp.webhook.zapi.duplicate",
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
      eventId: recorded.event.id,
      status: result.status === "ignored" ? "ignored" : "processed",
    });
    return result;
  } catch (error) {
    await auditWhatsappServiceEvent(
      context,
      {
        action: "crm.whatsapp.webhook.zapi.failed",
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
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      eventId: recorded.event.id,
      status: "failed",
    });
    throw error;
  }
}
