import type {
  PaymentProviderCheckoutInput,
  PaymentProviderCheckoutResult,
} from "../../domains/billing/ports/paymentProviderGateway.js";
import type { AsaasClient } from "./asaasPaymentProviderHttp.js";
import { readString, requiredString } from "./asaasPaymentProviderHttp.js";
import { centsToAsaasValue, onlyDigits } from "./asaasPaymentProviderValues.js";

export async function createAsaasCheckout(
  client: AsaasClient,
  input: PaymentProviderCheckoutInput,
): Promise<PaymentProviderCheckoutResult> {
  const checkout = await client.request("POST", "/checkouts", {
    body: checkoutBody(input),
  });
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

function checkoutUrl(baseUrl: string, providerCheckoutId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("id", providerCheckoutId);
  return url.toString();
}

function checkoutExpiresAt(minutesToExpire: number): Date {
  return new Date(Date.now() + minutesToExpire * 60_000);
}
