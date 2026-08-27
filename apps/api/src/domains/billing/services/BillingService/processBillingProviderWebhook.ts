import { randomUUID } from "node:crypto";
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
import { parseAsaasWebhook } from "../../readModels/asaasWebhookParser.js";
import { BillingWebhookAuthenticationError } from "../../readModels/billingWebhookErrors.js";
import { webhookResultStatus } from "./billingWebhookResultStatus.js";
import { syncBillingWebhookEvidence } from "./billingWebhookSync.js";

const permission = "billing.webhook.ingest" as const;
const processingLeaseMs = 5 * 60 * 1_000;

export type ProcessBillingProviderWebhookInput = {
  payload: Record<string, unknown>;
  provider: "asaas";
  webhookToken: string | null;
};

export type BillingProviderWebhookResult = {
  eventId: string;
  providerEventId: string;
  status: "duplicate" | "ignored" | "pending_reconciliation" | "processed";
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
  const processingStartedAt = new Date();
  const processingToken = randomUUID();
  const claimed = await repository.claimForProcessing({
    eventId: recorded.event.id,
    processingStartedAt,
    processingToken,
    staleBefore: new Date(processingStartedAt.getTime() - processingLeaseMs),
  });

  if (!claimed) {
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

  await auditWebhook(context, {
    action: "billing.webhook.asaas.observed",
    eventId: recorded.event.id,
    outcome: "succeeded",
    providerEventId: webhook.providerEventId,
    status: "observed",
    summary: "Observed Asaas billing webhook before applying provider evidence",
    sync: { status: "pending_reconciliation", storeId: null, tenantId: null },
  });

  let sync: BillingProviderSyncResult;
  try {
    sync = await syncBillingWebhookEvidence(
      webhook,
      repository,
      ports,
      context.requestId,
    );
  } catch (error) {
    await repository.updateStatus({
      errorMessage: error instanceof Error ? error.name : "UnknownError",
      eventId: claimed.id,
      processingToken,
      status: "failed",
    });
    await auditWebhookBestEffort(context, {
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

  const resultStatus = webhookResultStatus(sync.status);
  const metadata = createServiceLogMetadata(context, {
    eventType: webhook.eventType,
    providerEventId: webhook.providerEventId,
    syncStatus: sync.status,
    ...(sync.reason ? { syncReason: sync.reason } : {}),
    ...(sync.storeId ? { syncStoreId: sync.storeId } : {}),
    ...(sync.tenantId ? { syncTenantId: sync.tenantId } : {}),
  });
  context.logger.info("billing.webhook.asaas.record.completed", metadata);
  if (sync.reason === "checkout_diverged_from_authoritative_payment") {
    context.logger.warn(
      "metric.billing.webhook.checkout_payment_divergence",
      metadata,
    );
  }
  const updated = await repository.updateStatus({
    eventId: claimed.id,
    processingToken,
    status: resultStatus,
    storeId: sync.storeId,
    tenantId: sync.tenantId,
  });
  if (!updated) {
    context.logger.error(
      "alert.billing.webhook.claim_lost_after_sync",
      metadata,
    );
  } else {
    await auditWebhookBestEffort(context, {
      action: "billing.webhook.asaas.processed",
      eventId: recorded.event.id,
      outcome: "succeeded",
      providerEventId: webhook.providerEventId,
      status: resultStatus,
      summary: "Processed Asaas billing webhook",
      sync,
    });
  }
  return {
    eventId: recorded.event.id,
    providerEventId: webhook.providerEventId,
    status: resultStatus,
  };
}

function assertWebhookToken(
  token: string | null,
  ports: BillingServicePorts,
): void {
  if (ports.paymentProviderGateway?.verifyWebhookToken?.(token)) return;
  throw new BillingWebhookAuthenticationError("Invalid Asaas webhook token.");
}

async function auditWebhook(
  context: ServiceContext,
  input: {
    action: string;
    eventId: string;
    outcome: "failed" | "succeeded";
    providerEventId: string;
    status: BillingProviderWebhookResult["status"] | "failed" | "observed";
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

async function auditWebhookBestEffort(
  context: ServiceContext,
  input: Parameters<typeof auditWebhook>[1],
) {
  try {
    await auditWebhook(context, input);
  } catch (error) {
    context.logger.error(
      "alert.billing.webhook.outcome_audit_failed",
      createServiceLogMetadata(context, {
        auditAction: input.action,
        errorName: error instanceof Error ? error.name : "UnknownError",
        providerEventId: input.providerEventId,
        status: input.status,
      }),
    );
  }
}
