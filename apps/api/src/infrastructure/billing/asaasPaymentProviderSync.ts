import type {
  PaymentProviderCheckoutInput,
  PaymentProviderCheckoutResult,
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

export async function createAsaasCheckout(
  client: AsaasClient,
  input: PaymentProviderCheckoutInput,
): Promise<PaymentProviderCheckoutResult> {
  const body = checkoutBody(input);
  const checkout = await client.request("POST", "/checkouts", { body });
  const providerCheckoutId = requiredString(checkout.id, "checkout.id");

  return {
    checkoutUrl:
      readString(checkout.link) ??
      checkoutUrl(client.checkoutBaseUrl, providerCheckoutId),
    expiresAt: checkoutExpiresAt(input.minutesToExpire),
    externalReference: input.externalReference,
    provider: "asaas",
    providerCheckoutId,
    raw: checkout,
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

function checkoutBody(input: PaymentProviderCheckoutInput) {
  const customer = customerData(input);
  return {
    billingTypes: input.billingTypes,
    callback: input.callback,
    chargeTypes: ["RECURRENT"],
    ...(customer ? { customerData: customer } : {}),
    externalReference: input.externalReference,
    items: input.items.map((item) => ({
      ...(item.description
        ? { description: truncate(item.description, 150) }
        : {}),
      name: truncate(item.name, 30),
      quantity: item.quantity,
      value: centsToAsaasValue(item.valueCents),
    })),
    minutesToExpire: input.minutesToExpire,
    subscription: {
      cycle: "MONTHLY",
      nextDueDate: input.nextDueDate,
    },
  };
}

function customerData(input: PaymentProviderCheckoutInput) {
  if (!input.customerData) return null;
  const cpfCnpj = input.customerData.cpfCnpj
    ? onlyDigits(input.customerData.cpfCnpj)
    : null;
  const phone = input.customerData.phone
    ? onlyDigits(input.customerData.phone)
    : null;
  const data = {
    ...(cpfCnpj ? { cpfCnpj } : {}),
    ...(input.customerData.email ? { email: input.customerData.email } : {}),
    name: input.customerData.name,
    ...(phone ? { phone } : {}),
  };
  return Object.keys(data).length > 1 ? data : null;
}

function truncate(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength).trimEnd();
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

function checkoutUrl(baseUrl: string, providerCheckoutId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("id", providerCheckoutId);
  return url.toString();
}

function checkoutExpiresAt(minutesToExpire: number): Date {
  return new Date(Date.now() + minutesToExpire * 60_000);
}
