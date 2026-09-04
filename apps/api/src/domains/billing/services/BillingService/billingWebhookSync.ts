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
    ? retryableProviderEvidence(
        await repository.syncProviderCheckout(webhook.checkout),
      )
    : null;
  const paymentResult = webhook.payment
    ? await syncPayment(
        webhook.payment,
        webhook.providerEventId,
        webhook.occurredAt,
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
    checkoutResult = retryableProviderEvidence(
      await repository.syncProviderCheckout(webhook.checkout),
    );
  }
  const checkoutDivergedFromAuthoritativePayment = Boolean(
    checkoutResult?.status === "pending_reconciliation" &&
    webhook.payment?.status === "paid" &&
    paymentResult?.status === "synced" &&
    scopesAreCompatible(checkoutResult, paymentResult),
  );
  if (checkoutResult && !checkoutDivergedFromAuthoritativePayment) {
    results.push(checkoutResult);
  }
  if (paymentResult) results.push(paymentResult);
  if (webhook.subscription) {
    results.push(
      retryableProviderEvidence(
        await repository.syncProviderSubscription({
          ...webhook.subscription,
          eventOccurredAt: webhook.occurredAt,
          providerEventId: webhook.providerEventId,
        }),
      ),
    );
  }
  if (!results.length) return resultWithoutBillingEvidence(webhook.eventType);
  const merged = mergeSyncResults(results);
  return checkoutDivergedFromAuthoritativePayment && merged.status === "synced"
    ? {
        ...merged,
        reason: "checkout_diverged_from_authoritative_payment",
      }
    : merged;
}

async function syncPayment(
  payment: NonNullable<ParsedAsaasWebhook["payment"]>,
  providerEventId: string,
  providerEventOccurredAt: Date | null,
  repository: ReturnType<typeof getBillingWebhookRepository>,
  ports: BillingServicePorts,
  requestId: string,
): Promise<BillingProviderSyncResult> {
  const input = {
    ...payment,
    providerEventId,
    providerEventOccurredAt,
    requestId,
  };
  const initial = retryableProviderEvidence(
    await repository.upsertProviderPayment(input),
  );
  if (initial.status === "synced") return initial;
  const lookup = ports.paymentProviderGateway?.lookupPaymentCorrelation;
  if (!lookup) return initial;
  try {
    const correlation = await lookup({
      externalReference: input.externalReference,
      providerCheckoutId: input.providerCheckoutId ?? null,
      providerPaymentId: input.providerPaymentId,
      providerSubscriptionId: input.providerSubscriptionId,
    });
    if (
      !correlation ||
      correlation.providerPaymentId !== input.providerPaymentId
    ) {
      return initial;
    }
    return retryableProviderEvidence(
      await repository.upsertProviderPayment({
        ...input,
        externalReference:
          correlation.externalReference ?? input.externalReference,
        providerCheckoutId:
          correlation.providerCheckoutId ?? input.providerCheckoutId ?? null,
        providerCustomerId:
          correlation.providerCustomerId ?? input.providerCustomerId,
        providerEvidenceVerified: true,
        providerSubscriptionId:
          correlation.providerSubscriptionId ?? input.providerSubscriptionId,
      }),
    );
  } catch {
    return initial;
  }
}

function mergeSyncResults(
  results: BillingProviderSyncResult[],
): BillingProviderSyncResult {
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

function scopesAreCompatible(
  left: BillingProviderSyncResult,
  right: BillingProviderSyncResult,
) {
  return (
    (!left.tenantId || !right.tenantId || left.tenantId === right.tenantId) &&
    (!left.storeId || !right.storeId || left.storeId === right.storeId)
  );
}

function retryableProviderEvidence(
  result: BillingProviderSyncResult,
): BillingProviderSyncResult {
  return result.status === "ignored"
    ? {
        ...result,
        reason: result.reason ?? "unmatched_provider_evidence",
        status: "pending_reconciliation",
      }
    : result;
}

function resultWithoutBillingEvidence(
  eventType: string,
): BillingProviderSyncResult {
  if (!isExplicitlyOutsideBillingDomain(eventType)) {
    return {
      reason: "missing_billing_event_evidence",
      status: "pending_reconciliation",
      storeId: null,
      tenantId: null,
    };
  }
  return {
    reason: "event_outside_billing_domain",
    status: "ignored",
    storeId: null,
    tenantId: null,
  };
}

function isExplicitlyOutsideBillingDomain(eventType: string): boolean {
  return nonBillingEventPrefixes.some((prefix) => eventType.startsWith(prefix));
}

const nonBillingEventPrefixes = [
  "ACCOUNT_",
  "ANTICIPATION_",
  "BILL_",
  "CUSTOMER_",
  "DOCUMENT_",
  "FINANCIAL_TRANSACTION_",
  "INVOICE_",
  "MOBILE_PHONE_RECHARGE_",
  "PIX_",
  "RECEIVABLE_",
  "TRANSFER_",
] as const;
