import type { PaymentProviderPaymentCorrelation } from "../../domains/billing/ports/paymentProviderGateway.js";
import type { AsaasClient } from "./asaasPaymentProviderHttp.js";
import { readRecordArray, readString } from "./asaasPaymentProviderHttp.js";

export async function lookupAsaasPaymentCorrelation(
  client: AsaasClient,
  input: {
    externalReference?: string | null;
    providerCheckoutId?: string | null;
    providerPaymentId: string;
    providerSubscriptionId?: string | null;
  },
): Promise<PaymentProviderPaymentCorrelation | null> {
  const direct = await requestEvidence(() =>
    client.request(
      "GET",
      `/payments/${encodeURIComponent(input.providerPaymentId)}`,
    ),
  );
  const directCorrelation = direct ? paymentCorrelation(direct) : null;
  if (
    directCorrelation?.providerPaymentId === input.providerPaymentId &&
    hasUsefulCorrelation(directCorrelation)
  ) {
    return directCorrelation;
  }

  const queries: readonly {
    key: "checkoutSession" | "externalReference";
    value: string;
  }[] = [
    ...(input.providerCheckoutId
      ? [{ key: "checkoutSession" as const, value: input.providerCheckoutId }]
      : []),
    ...(input.externalReference
      ? [{ key: "externalReference" as const, value: input.externalReference }]
      : []),
  ];
  for (const query of queries) {
    const result = await requestEvidence(() =>
      client.request("GET", "/payments", {
        query: { [query.key]: query.value, limit: "2" },
      }),
    );
    const correlation = result
      ? uniqueMatchingCorrelation(result, input.providerPaymentId, (row) =>
          query.key === "checkoutSession"
            ? (readString(row.checkoutSession) ?? readString(row.checkout)) ===
              query.value
            : readString(row.externalReference) === query.value,
        )
      : null;
    if (correlation) return correlation;
  }

  if (input.providerSubscriptionId) {
    const providerSubscriptionId = input.providerSubscriptionId;
    const result = await requestEvidence(() =>
      client.request(
        "GET",
        `/subscriptions/${encodeURIComponent(providerSubscriptionId)}/payments`,
        { query: { limit: "2" } },
      ),
    );
    const correlation = result
      ? uniqueMatchingCorrelation(
          result,
          input.providerPaymentId,
          (row) => readString(row.subscription) === providerSubscriptionId,
        )
      : null;
    if (correlation) return correlation;
  }
  return null;
}

function paymentCorrelation(
  payment: Record<string, unknown>,
): PaymentProviderPaymentCorrelation | null {
  const providerPaymentId = readString(payment.id);
  if (!providerPaymentId) return null;
  return {
    externalReference: readString(payment.externalReference),
    providerCheckoutId:
      readString(payment.checkoutSession) ?? readString(payment.checkout),
    providerCustomerId: readString(payment.customer),
    providerPaymentId,
    providerSubscriptionId: readString(payment.subscription),
  };
}

function uniqueMatchingCorrelation(
  result: Record<string, unknown>,
  providerPaymentId: string,
  matchesLookup: (row: Record<string, unknown>) => boolean,
): PaymentProviderPaymentCorrelation | null {
  if (result.hasMore === true) return null;
  const matches = readRecordArray(result.data).filter(
    (row) => readString(row.id) === providerPaymentId && matchesLookup(row),
  );
  if (matches.length !== 1) return null;
  return paymentCorrelation(matches[0]!);
}

async function requestEvidence(
  request: () => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown> | null> {
  try {
    return await request();
  } catch {
    return null;
  }
}

function hasUsefulCorrelation(
  correlation: PaymentProviderPaymentCorrelation,
): boolean {
  return Boolean(
    correlation.externalReference ||
    correlation.providerCheckoutId ||
    correlation.providerSubscriptionId,
  );
}
