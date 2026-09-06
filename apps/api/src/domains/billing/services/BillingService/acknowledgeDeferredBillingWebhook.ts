import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { BillingProviderWebhookEvent } from "../../ports/billingWebhookRepository.js";
import type { ParsedAsaasWebhook } from "../../readModels/asaasWebhookParser.js";
import type { BillingProviderWebhookResult } from "./processBillingProviderWebhook.js";

export async function acknowledgeDeferredBillingWebhook(
  context: ServiceContext,
  recorded: {
    created: boolean;
    event: BillingProviderWebhookEvent;
  },
  webhook: ParsedAsaasWebhook,
): Promise<BillingProviderWebhookResult> {
  assertPermission(context, "billing.webhook.ingest");
  const terminalDuplicate =
    !recorded.created &&
    (recorded.event.status === "processed" ||
      recorded.event.status === "ignored");
  await auditDeferredWebhook(context, {
    eventId: recorded.event.id,
    providerEventId: webhook.providerEventId,
    status: terminalDuplicate ? "duplicate" : "observed",
    storeId: recorded.event.storeId,
    tenantId: recorded.event.tenantId,
  });
  return {
    eventId: recorded.event.id,
    providerEventId: webhook.providerEventId,
    status: terminalDuplicate ? "duplicate" : "pending_reconciliation",
  };
}

async function auditDeferredWebhook(
  context: ServiceContext,
  input: {
    eventId: string;
    providerEventId: string;
    status: "duplicate" | "observed";
    storeId: BillingProviderWebhookEvent["storeId"];
    tenantId: BillingProviderWebhookEvent["tenantId"];
  },
): Promise<void> {
  try {
    await context.audit.record({
      action:
        input.status === "duplicate"
          ? "billing.webhook.asaas.duplicate"
          : "billing.webhook.asaas.observed",
      actor: context.actor,
      category: "integration",
      criticality: "critical",
      entityId: input.eventId,
      entityType: "billing_provider_event",
      metadata: {
        provider: "asaas",
        providerEventId: input.providerEventId,
        status: input.status,
      },
      outcome: "succeeded",
      requestId: context.requestId,
      storeId: input.storeId,
      tenantId: input.tenantId,
      summary:
        input.status === "duplicate"
          ? "Skipped duplicate Asaas billing webhook"
          : "Persisted Asaas billing webhook for asynchronous processing",
    });
  } catch (error) {
    context.logger.error("alert.billing.webhook.outcome_audit_failed", {
      auditAction:
        input.status === "duplicate"
          ? "billing.webhook.asaas.duplicate"
          : "billing.webhook.asaas.observed",
      errorName: error instanceof Error ? error.name : "UnknownError",
      providerEventId: input.providerEventId,
      status: input.status,
    });
  }
}
