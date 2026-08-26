import type { BillingProviderSyncResult } from "../../ports/billingWebhookRepository.js";
import type { ParsedAsaasWebhook } from "../../readModels/asaasWebhookParser.js";
import type {
  getBillingWebhookRepository,
  BillingServicePorts,
} from "./serviceSupport.js";

export async function syncBillingWebhookEvidence(
  webhook: ParsedAsaasWebhook,
  repository: ReturnType<typeof getBillingWebhookRepository>,
  ports: BillingServicePorts,
  requestId: string,
): Promise<BillingProviderSyncResult> {
  const results: BillingProviderSyncResult[] = [];
  let checkoutResult = webhook.checkout
    ? await repository.syncProviderCheckout(webhook.checkout)
    : null;
  const paymentResult = webhook.payment
    ? await syncPayment(
        webhook.payment,
        webhook.providerEventId,
        repository,
        ports,
        requestId,
      )
    : null;

  if (
    webhook.checkout &&
    checkoutResult?.status === "pending_reconciliation" &&
    paymentResult?.status === "synced"
  ) {
    checkoutResult = await repository.syncProviderCheckout(webhook.checkout);
  }
  if (checkoutResult) results.push(checkoutResult);
  if (paymentResult) results.push(paymentResult);
  if (webhook.subscription) {
    results.push(
      await repository.syncProviderSubscription({
        ...webhook.subscription,
        eventOccurredAt: webhook.occurredAt,
        providerEventId: webhook.providerEventId,
      }),
    );
  }
  return mergeSyncResults(results);
}

async function syncPayment(
  payment: NonNullable<ParsedAsaasWebhook["payment"]>,
  providerEventId: string,
  repository: ReturnType<typeof getBillingWebhookRepository>,
  ports: BillingServicePorts,
  requestId: string,
): Promise<BillingProviderSyncResult> {
  const input = { ...payment, providerEventId, requestId };
  const initial = await repository.upsertProviderPayment(input);
  if (initial.status !== "pending_reconciliation") return initial;
  const lookup = ports.paymentProviderGateway?.lookupPaymentCorrelation;
  if (!lookup) return initial;
  try {
    const correlation = await lookup({
      externalReference: input.externalReference,
      providerCheckoutId: input.providerCheckoutId ?? null,
      providerPaymentId: input.providerPaymentId,
      providerSubscriptionId: input.providerSubscriptionId,
    });
    if (!correlation) return initial;
    return repository.upsertProviderPayment({
      ...input,
      externalReference:
        correlation.externalReference ?? input.externalReference,
      providerCheckoutId:
        correlation.providerCheckoutId ?? input.providerCheckoutId ?? null,
      providerCustomerId:
        correlation.providerCustomerId ?? input.providerCustomerId,
      providerSubscriptionId:
        correlation.providerSubscriptionId ?? input.providerSubscriptionId,
    });
  } catch {
    return initial;
  }
}

function mergeSyncResults(
  results: BillingProviderSyncResult[],
): BillingProviderSyncResult {
  if (results.length === 0) return unsupportedEvent();
  const tenantIds = new Set(
    results.flatMap((result) => (result.tenantId ? [result.tenantId] : [])),
  );
  const storeIds = new Set(
    results.flatMap((result) => (result.storeId ? [result.storeId] : [])),
  );
  if (tenantIds.size > 1 || storeIds.size > 1) {
    return {
      reason: "conflicting_webhook_scope",
      status: "pending_reconciliation",
      storeId: null,
      tenantId: null,
    };
  }
  const selected =
    results.find((result) => result.status === "pending_reconciliation") ??
    results.findLast((result) => result.status === "synced") ??
    results.at(-1)!;
  return {
    ...(selected.reason ? { reason: selected.reason } : {}),
    status: selected.status,
    storeId: selected.storeId ?? [...storeIds][0] ?? null,
    tenantId: selected.tenantId ?? [...tenantIds][0] ?? null,
  };
}

function unsupportedEvent(): BillingProviderSyncResult {
  return {
    reason: "unsupported_event",
    status: "ignored",
    storeId: null,
    tenantId: null,
  };
}
