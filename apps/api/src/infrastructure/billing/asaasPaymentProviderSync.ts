import type {
  PaymentProviderCustomerInput,
  PaymentProviderCustomerResult,
  PaymentProviderSubscriptionInput,
  PaymentProviderSubscriptionResult,
} from "../../domains/billing/ports/paymentProviderGateway.js";
import {
  AsaasGatewayError,
  type AsaasClient,
  readRecordArray,
  readString,
  requiredString,
} from "./asaasPaymentProviderHttp.js";

export async function syncAsaasCustomer(
  client: AsaasClient,
  input: PaymentProviderCustomerInput,
): Promise<PaymentProviderCustomerResult> {
  if (input.existingProviderCustomerId) {
    return {
      created: false,
      provider: "asaas",
      providerCustomerId: input.existingProviderCustomerId,
    };
  }

  const existingByReference = await findCustomer(client, {
    externalReference: input.externalReference,
  });
  if (existingByReference) return existingByReference;

  const cpfCnpj = onlyDigits(input.documentNumber);
  if (cpfCnpj) {
    const existingByDocument = await findCustomer(client, { cpfCnpj });
    if (existingByDocument) return existingByDocument;
  }
  if (!cpfCnpj) {
    throw new AsaasGatewayError(
      "asaas_customer_document_missing",
      "Billing customer document number is required before creating Asaas customer.",
      400,
    );
  }

  const customer = await client.request("POST", "/customers", {
    body: {
      cpfCnpj,
      ...(input.email ? { email: input.email } : {}),
      externalReference: input.externalReference,
      name: input.name,
      notificationDisabled: false,
    },
  });
  return {
    created: true,
    provider: "asaas",
    providerCustomerId: requiredString(customer.id, "customer.id"),
  };
}

export async function syncAsaasSubscription(
  client: AsaasClient,
  input: PaymentProviderSubscriptionInput,
): Promise<PaymentProviderSubscriptionResult> {
  const body = subscriptionBody(input);
  const subscription = input.existingProviderSubscriptionId
    ? await client.request(
        "PUT",
        `/subscriptions/${encodeURIComponent(input.existingProviderSubscriptionId)}`,
        { body },
      )
    : await client.request("POST", "/subscriptions", { body });

  return {
    created: !input.existingProviderSubscriptionId,
    currentPeriodEnd: parseAsaasDate(readString(subscription.nextDueDate)),
    provider: "asaas",
    providerSubscriptionId: requiredString(subscription.id, "subscription.id"),
    status: asaasSubscriptionStatus(readString(subscription.status)),
  };
}

async function findCustomer(
  client: AsaasClient,
  query: Record<string, string>,
): Promise<PaymentProviderCustomerResult | null> {
  const result = await client.request("GET", "/customers", {
    query: { ...query, limit: "1" },
  });
  const first = readRecordArray(result.data)[0];
  const customerId = first ? readString(first.id) : null;
  if (!customerId) return null;
  return {
    created: false,
    provider: "asaas",
    providerCustomerId: customerId,
  };
}

function subscriptionBody(input: PaymentProviderSubscriptionInput) {
  return {
    billingType: input.billingType,
    customer: input.customerId,
    cycle: "MONTHLY",
    description: input.description.slice(0, 500),
    externalReference: input.externalReference,
    nextDueDate: input.nextDueDate,
    updatePendingPayments: input.updatePendingPayments,
    value: centsToAsaasValue(input.valueCents),
  };
}

function centsToAsaasValue(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

function onlyDigits(value: string | null): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? digits : null;
}

function asaasSubscriptionStatus(
  status: string | null,
): PaymentProviderSubscriptionResult["status"] {
  if (
    status === "ACTIVE" ||
    status === "EXPIRED" ||
    status === "INACTIVE" ||
    status === "OVERDUE"
  ) {
    return status;
  }
  return "UNKNOWN";
}

function parseAsaasDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
