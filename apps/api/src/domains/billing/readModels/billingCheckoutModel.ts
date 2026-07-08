import type {
  BillingProviderAccount,
  BillingProviderSubscriptionRecord,
} from "../ports/billingProviderRepository.js";
import type {
  PaymentProviderCheckoutBillingType,
  PaymentProviderCheckoutLineItem,
} from "../ports/paymentProviderGateway.js";

export class BillingCheckoutError extends Error {
  readonly reason: string;
  readonly status: number;

  constructor(reason: string, message: string, status = 502) {
    super(message);
    this.name = "BillingCheckoutError";
    this.reason = reason;
    this.status = status;
  }
}

export function assertCheckoutableAccount(
  account: BillingProviderAccount | null,
): BillingProviderAccount & {
  subscription: BillingProviderSubscriptionRecord;
} {
  if (!account) {
    throw new BillingCheckoutError(
      "missing_billing_account",
      "Billing account was not found for this store.",
      404,
    );
  }
  if (!account.subscription) {
    throw new BillingCheckoutError(
      "missing_subscription",
      "Billing subscription was not found for this account.",
      409,
    );
  }
  if (account.chargePreview.totalCents <= 0) {
    throw new BillingCheckoutError(
      "empty_charge_preview",
      "Billing subscription has no positive chargeable value.",
      409,
    );
  }
  return account as BillingProviderAccount & {
    subscription: BillingProviderSubscriptionRecord;
  };
}

export function checkoutExternalReference(input: {
  nonce: string;
  subscriptionId: string;
}): string {
  return `lojaveiculos:subscription:${input.subscriptionId}:checkout:${input.nonce}`;
}

export function checkoutLineItems(
  account: BillingProviderAccount,
): PaymentProviderCheckoutLineItem[] {
  return account.chargePreview.lineItems.map((item) => ({
    description: item.description,
    name: item.label,
    quantity: item.quantity,
    valueCents: Math.round(item.amountCents / Math.max(item.quantity, 1)),
  }));
}

export function checkoutBillingTypes(
  value: readonly PaymentProviderCheckoutBillingType[] | undefined,
): readonly PaymentProviderCheckoutBillingType[] {
  if (value?.length && !value.includes("CREDIT_CARD")) {
    throw new BillingCheckoutError(
      "unsupported_recurring_payment_method",
      "Asaas recurring checkout currently requires credit card billing.",
      400,
    );
  }
  return ["CREDIT_CARD"];
}

export function checkoutCallbackUrls(input: {
  publicAppUrl: string | undefined;
  returnPath: string;
}) {
  const baseUrl = input.publicAppUrl?.trim();
  if (!baseUrl) {
    throw new BillingCheckoutError(
      "missing_public_app_url",
      "PUBLIC_APP_URL is required to create Asaas checkout callbacks.",
      503,
    );
  }
  return {
    cancelUrl: callbackUrl(baseUrl, input.returnPath, "cancelled"),
    expiredUrl: callbackUrl(baseUrl, input.returnPath, "expired"),
    successUrl: callbackUrl(baseUrl, input.returnPath, "success"),
  };
}

export function toCheckoutError(error: unknown): BillingCheckoutError {
  if (error instanceof BillingCheckoutError) return error;
  const status = readNumber(error, "status");
  const code = readString(error, "code");
  return new BillingCheckoutError(
    code ?? "provider_checkout_failed",
    error instanceof Error ? error.message : "Billing checkout request failed.",
    status ?? 502,
  );
}

function callbackUrl(baseUrl: string, returnPath: string, status: string) {
  const url = new URL(
    returnPath,
    baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
  );
  url.searchParams.set("checkout", status);
  return url.toString();
}

function readNumber(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "number" && Number.isInteger(property)
    ? property
    : null;
}

function readString(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" && property ? property : null;
}
