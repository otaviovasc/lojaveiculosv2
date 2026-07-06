import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import type { BillingProviderSyncResult } from "../../ports/billingWebhookRepository.js";
import {
  getBillingEnvironment,
  getBillingWebhookRepository,
  type BillingServicePorts,
} from "./serviceSupport.js";
import {
  parseAsaasWebhook,
  type ParsedAsaasWebhook,
} from "../../readModels/asaasWebhookParser.js";
import { BillingWebhookAuthenticationError } from "../../readModels/billingWebhookErrors.js";

const permission = "billing.webhook.ingest" as const;

export type ProcessBillingProviderWebhookInput = {
  payload: Record<string, unknown>;
  provider: "asaas";
  webhookToken: string | null;
};

export type BillingProviderWebhookResult = {
  eventId: string;
  providerEventId: string;
  status: "duplicate" | "ignored" | "processed";
};

export async function processBillingProviderWebhook(
  context: ServiceContext,
  input: ProcessBillingProviderWebhookInput,
  ports: BillingServicePorts,
): Promise<BillingProviderWebhookResult> {
  assertPermission(context, permission);
  assertWebhookToken(input.webhookToken, ports);
  const webhook = parseAsaasWebhook(input.payload);
  const repository = getBillingWebhookRepository(ports);

  context.logger.info(
    "billing.webhook.asaas.record.started",
    createServiceLogMetadata(context, {
      eventType: webhook.eventType,
      providerEventId: webhook.providerEventId,
    }),
  );

  const recorded = await repository.recordReceived({
    environment: getBillingEnvironment(ports),
    eventType: webhook.eventType,
    payload: input.payload,
    provider: input.provider,
    providerEventId: webhook.providerEventId,
  });

  if (!recorded.created && recorded.event.status !== "failed") {
    await auditWebhook(context, {
      action: "billing.webhook.asaas.duplicate",
      eventId: recorded.event.id,
      outcome: "succeeded",
      providerEventId: webhook.providerEventId,
      status: "duplicate",
      summary: "Skipped duplicate Asaas billing webhook",
      sync: {
        status: "ignored",
        storeId: recorded.event.storeId,
        tenantId: recorded.event.tenantId,
      },
    });
    return {
      eventId: recorded.event.id,
      providerEventId: webhook.providerEventId,
      status: "duplicate",
    };
  }

  try {
    const sync = await syncWebhook(webhook, repository);
    await repository.updateStatus({
      eventId: recorded.event.id,
      status: sync.status === "synced" ? "processed" : "ignored",
      storeId: sync.storeId,
      tenantId: sync.tenantId,
    });
    await auditWebhook(context, {
      action: "billing.webhook.asaas.processed",
      eventId: recorded.event.id,
      outcome: "succeeded",
      providerEventId: webhook.providerEventId,
      status: sync.status === "synced" ? "processed" : "ignored",
      summary: "Processed Asaas billing webhook",
      sync,
    });
    return {
      eventId: recorded.event.id,
      providerEventId: webhook.providerEventId,
      status: sync.status === "synced" ? "processed" : "ignored",
    };
  } catch (error) {
    await repository.updateStatus({
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      eventId: recorded.event.id,
      status: "failed",
    });
    await auditWebhook(context, {
      action: "billing.webhook.asaas.failed",
      eventId: recorded.event.id,
      outcome: "failed",
      providerEventId: webhook.providerEventId,
      status: "failed",
      summary: "Failed Asaas billing webhook processing",
      sync: { status: "ignored", storeId: null, tenantId: null },
    });
    throw error;
  }
}

function assertWebhookToken(
  token: string | null,
  ports: BillingServicePorts,
): void {
  if (ports.paymentProviderGateway?.verifyWebhookToken?.(token)) return;
  throw new BillingWebhookAuthenticationError("Invalid Asaas webhook token.");
}

async function syncWebhook(
  webhook: ParsedAsaasWebhook,
  repository: ReturnType<typeof getBillingWebhookRepository>,
): Promise<BillingProviderSyncResult> {
  if (webhook.payment) {
    return repository.upsertProviderPayment(webhook.payment);
  }
  if (webhook.subscription) {
    return repository.syncProviderSubscription(webhook.subscription);
  }
  return {
    reason: "unsupported_event",
    status: "ignored",
    storeId: null,
    tenantId: null,
  };
}

async function auditWebhook(
  context: ServiceContext,
  input: {
    action: string;
    eventId: string;
    outcome: "failed" | "succeeded";
    providerEventId: string;
    status: BillingProviderWebhookResult["status"] | "failed";
    summary: string;
    sync: BillingProviderSyncResult;
  },
) {
  await context.audit.record({
    action: input.action,
    actor: context.actor,
    category: "integration",
    criticality: "critical",
    entityId: input.eventId,
    entityType: "billing_provider_event",
    metadata: {
      provider: "asaas",
      providerEventId: input.providerEventId,
      reason: input.sync.reason ?? null,
      status: input.status,
    },
    outcome: input.outcome,
    requestId: context.requestId,
    storeId: input.sync.storeId ?? null,
    tenantId: input.sync.tenantId ?? null,
    summary: input.summary,
  });
}
