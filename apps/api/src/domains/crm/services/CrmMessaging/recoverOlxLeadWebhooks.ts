import { randomUUID } from "node:crypto";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import {
  clearOlxLeadReceiptPayload,
  olxLeadReceiptEventType,
} from "../../messaging/olxLeadReceipt.js";
import type { CrmProviderWebhookEvent } from "../../ports/crmWebhookEventRepository.js";
import {
  getCrmWebhookEventRepository,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import { auditWhatsappServiceEvent } from "../CrmWhatsapp/serviceSupport.js";
import { processOlxLeadReceipt } from "./processOlxLeadReceipt.js";

const permission = "crm.whatsapp.ingest" as const;
const leaseMs = 5 * 60 * 1_000;
const maxAttempts = 10;

export type RecoverOlxLeadWebhooksResult = {
  claimed: number;
  failed: number;
  processed: number;
};

export async function recoverOlxLeadWebhooks(
  context: ServiceContext,
  input: { limit: number; now?: Date },
  ports: CrmServicePorts,
): Promise<RecoverOlxLeadWebhooksResult> {
  assertPermission(context, permission);
  const now = input.now ?? new Date();
  const processingToken = randomUUID();
  const repository = getCrmWebhookEventRepository(ports);
  const claimed = await repository.claimDueEvents({
    eventType: olxLeadReceiptEventType,
    limit: input.limit,
    maxAttempts,
    now,
    processingToken,
    provider: "olx_chat",
    staleBefore: new Date(now.getTime() - leaseMs),
  });
  const result = { claimed: claimed.length, failed: 0, processed: 0 };
  for (const event of claimed) {
    await recoverOne(context, event, processingToken, ports, result);
  }
  context.logger.info("crm.lead.webhook.olx.recovery.completed", {
    ...result,
    requestId: context.requestId,
  });
  await auditWhatsappServiceEvent(
    context,
    {
      action: "crm.lead.webhook.olx.recovery.completed",
      category: "data_change",
      entityId: context.requestId,
      entityType: "crm_webhook_recovery_batch",
      metadata: { ...result, provider: "olx" },
      permission,
      summary: "Recovered durable OLX lead webhooks",
    },
    result.failed > 0 ? "failed" : "succeeded",
  );
  return result;
}

async function recoverOne(
  context: ServiceContext,
  event: CrmProviderWebhookEvent,
  processingToken: string,
  ports: CrmServicePorts,
  result: RecoverOlxLeadWebhooksResult,
) {
  const repository = getCrmWebhookEventRepository(ports);
  try {
    await processOlxLeadReceipt(context, event, ports);
    const completed = await repository.updateStatus({
      eventId: event.id,
      payload: clearOlxLeadReceiptPayload(event.payload, new Date()),
      processingToken,
      status: "processed",
    });
    if (!completed)
      throw new Error("OLX lead receipt processing lease was lost.");
    result.processed += 1;
  } catch (error) {
    await repository.updateStatus({
      errorMessage: error instanceof Error ? error.name : "UnknownError",
      eventId: event.id,
      processingToken,
      status: "failed",
    });
    result.failed += 1;
    context.logger.warn("crm.lead.webhook.olx.recovery.failed", {
      connectionId: event.connectionId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      providerEventId: event.id,
      requestId: context.requestId,
      storeId: event.storeId,
      tenantId: event.tenantId,
    });
  }
}
