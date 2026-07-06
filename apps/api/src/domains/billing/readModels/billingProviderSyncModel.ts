import type {
  BillingProviderAccount,
  BillingProviderSubscriptionRecord,
} from "../ports/billingProviderRepository.js";
import type { PaymentProviderSubscriptionResult } from "../ports/paymentProviderGateway.js";

export class BillingProviderSyncError extends Error {
  readonly reason: string;
  readonly status: number;

  constructor(reason: string, message: string, status = 502) {
    super(message);
    this.name = "BillingProviderSyncError";
    this.reason = reason;
    this.status = status;
  }
}

export function assertSyncableAccount(
  account: BillingProviderAccount | null,
): BillingProviderAccount & {
  subscription: BillingProviderSubscriptionRecord;
} {
  if (!account) {
    throw new BillingProviderSyncError(
      "missing_billing_account",
      "Billing account was not found for this store.",
      404,
    );
  }
  if (!account.subscription) {
    throw new BillingProviderSyncError(
      "missing_subscription",
      "Billing subscription was not found for this account.",
      409,
    );
  }
  if (account.chargePreview.totalCents <= 0) {
    throw new BillingProviderSyncError(
      "empty_charge_preview",
      "Billing subscription has no positive chargeable value.",
      409,
    );
  }
  return account as BillingProviderAccount & {
    subscription: BillingProviderSubscriptionRecord;
  };
}

export function toSyncError(error: unknown): BillingProviderSyncError {
  if (error instanceof BillingProviderSyncError) return error;
  const providerStatus = readNumericProperty(error, "status");
  const providerCode = readStringProperty(error, "code");
  return new BillingProviderSyncError(
    providerCode ?? "provider_request_failed",
    error instanceof Error
      ? error.message
      : "Billing payment provider request failed.",
    providerStatus ?? 502,
  );
}

export function toLocalSubscriptionStatus(
  input: PaymentProviderSubscriptionResult,
): BillingProviderSubscriptionRecord["status"] {
  if (input.status === "ACTIVE") return "active";
  if (input.status === "OVERDUE") return "past_due";
  if (input.status === "EXPIRED") return "expired";
  if (input.status === "INACTIVE") return "cancelled";
  return "trialing";
}

export function subscriptionDescription(
  account: BillingProviderAccount,
): string {
  const labels = account.chargePreview.lineItems
    .map((item) => item.label)
    .slice(0, 4)
    .join(", ");
  return labels
    ? `Loja Veiculos OS: ${labels}`
    : "Loja Veiculos OS mensalidade";
}

export function customerExternalReference(tenantId: string): string {
  return `lojaveiculos:tenant:${tenantId}`;
}

export function subscriptionExternalReference(subscriptionId: string): string {
  return `lojaveiculos:subscription:${subscriptionId}`;
}

export function realProviderId(
  value: string | null | undefined,
): string | null {
  return isRealProviderId(value) ? value : null;
}

export function isRealProviderId(
  value: string | null | undefined,
): value is string {
  return Boolean(value && !value.startsWith("local_"));
}

export function tomorrow(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readNumericProperty(value: unknown, key: string): number | null {
  if (!value || typeof value !== "object") return null;
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "number" && Number.isInteger(property)
    ? property
    : null;
}

function readStringProperty(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" && property ? property : null;
}
