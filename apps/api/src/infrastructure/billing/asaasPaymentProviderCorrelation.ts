import type { PaymentProviderPaymentCorrelation } from "../../domains/billing/ports/paymentProviderGateway.js";
import type { AsaasClient } from "./asaasPaymentProviderHttp.js";
import {
  readRecordArray,
  readString,
  requiredString,
} from "./asaasPaymentProviderHttp.js";

export async function lookupAsaasPaymentCorrelation(
  client: AsaasClient,
  input: {
    externalReference?: string | null;
    providerCheckoutId?: string | null;
    providerPaymentId: string;
    providerSubscriptionId?: string | null;
  },
): Promise<PaymentProviderPaymentCorrelation | null> {
  const direct = await client.request(
    "GET",
    `/payments/${encodeURIComponent(input.providerPaymentId)}`,
  );
  const directCorrelation = paymentCorrelation(direct);
  if (hasUsefulCorrelation(directCorrelation)) return directCorrelation;

  const queries = [
    ...(input.providerCheckoutId
      ? [{ checkoutSession: input.providerCheckoutId }]
      : []),
    ...(input.externalReference
      ? [{ externalReference: input.externalReference }]
      : []),
  ];
  for (const query of queries) {
    const result = await client.request("GET", "/payments", {
      query: { ...query, limit: "2" },
    });
    const rows = readRecordArray(result.data);
    if (rows.length === 1) return paymentCorrelation(rows[0]!);
  }

  if (input.providerSubscriptionId) {
    const result = await client.request(
      "GET",
      `/subscriptions/${encodeURIComponent(input.providerSubscriptionId)}/payments`,
      { query: { limit: "2" } },
    );
    const rows = readRecordArray(result.data);
    if (rows.length === 1) return paymentCorrelation(rows[0]!);
  }
  return null;
}

function paymentCorrelation(
  payment: Record<string, unknown>,
): PaymentProviderPaymentCorrelation {
  return {
    externalReference: readString(payment.externalReference),
    providerCheckoutId:
      readString(payment.checkoutSession) ?? readString(payment.checkout),
    providerCustomerId: readString(payment.customer),
    providerPaymentId: requiredString(payment.id, "payment.id"),
    providerSubscriptionId: readString(payment.subscription),
  };
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
