import type { PaymentProviderSubscriptionResult } from "../../domains/billing/ports/paymentProviderGateway.js";

export function centsToAsaasValue(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function onlyDigits(value: string | null): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? digits : null;
}

export function asaasSubscriptionStatus(
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

export function parseAsaasDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
