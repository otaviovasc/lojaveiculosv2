import type { BillingSubscription } from "../ports/billingRepository.js";
import type {
  BillingPaymentWebhookStatus,
  BillingWebhookRepository,
} from "../ports/billingWebhookRepository.js";
import { BillingWebhookValidationError } from "./billingWebhookErrors.js";

export type ParsedAsaasWebhook = {
  eventType: string;
  payment?: Parameters<BillingWebhookRepository["upsertProviderPayment"]>[0];
  providerEventId: string;
  subscription?: Parameters<
    BillingWebhookRepository["syncProviderSubscription"]
  >[0];
};

export function parseAsaasWebhook(
  payload: Record<string, unknown>,
): ParsedAsaasWebhook {
  const providerEventId = requiredString(payload.id, "id");
  const eventType = requiredString(payload.event, "event");
  const payment = readRecord(payload.payment);
  const subscription = readRecord(payload.subscription);

  return {
    eventType,
    ...(payment
      ? {
          payment: {
            amountCents: toCents(payment.value),
            dueAt: parseAsaasDate(readString(payment.dueDate)),
            externalReference: readString(payment.externalReference),
            invoiceUrl: readString(payment.invoiceUrl),
            paidAt: paymentPaidAt(payment),
            provider: "asaas",
            providerCustomerId: readString(payment.customer),
            providerPaymentId: requiredString(payment.id, "payment.id"),
            providerSubscriptionId: readString(payment.subscription),
            raw: payment,
            status: paymentStatus(eventType),
          },
        }
      : {}),
    providerEventId,
    ...(subscription
      ? {
          subscription: {
            currentPeriodEnd: parseAsaasDate(
              readString(subscription.nextDueDate),
            ),
            provider: "asaas",
            providerSubscriptionId: requiredString(
              subscription.id,
              "subscription.id",
            ),
            status: subscriptionStatus(
              eventType,
              readString(subscription.status),
            ),
          },
        }
      : {}),
  };
}

function paymentStatus(eventType: string): BillingPaymentWebhookStatus {
  if (eventType === "PAYMENT_RECEIVED") return "paid";
  if (eventType === "PAYMENT_OVERDUE") return "overdue";
  if (eventType.includes("REFUND")) return "refunded";
  if (
    eventType === "PAYMENT_DELETED" ||
    eventType === "PAYMENT_BANK_SLIP_CANCELLED" ||
    eventType === "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED" ||
    eventType === "PAYMENT_REPROVED_BY_RISK_ANALYSIS"
  ) {
    return "cancelled";
  }
  return "pending";
}

function subscriptionStatus(
  eventType: string,
  status: string | null,
): BillingSubscription["status"] {
  if (eventType === "SUBSCRIPTION_DELETED") return "cancelled";
  if (eventType === "SUBSCRIPTION_INACTIVATED") return "cancelled";
  if (status === "ACTIVE") return "active";
  if (status === "OVERDUE") return "past_due";
  if (status === "EXPIRED") return "expired";
  if (status === "INACTIVE" || status === "DELETED") return "cancelled";
  return "trialing";
}

function paymentPaidAt(payment: Record<string, unknown>) {
  return (
    parseAsaasDate(readString(payment.paymentDate)) ??
    parseAsaasDate(readString(payment.clientPaymentDate)) ??
    parseAsaasDate(readString(payment.confirmedDate))
  );
}

function parseAsaasDate(value: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  const brazilian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brazilian) {
    return new Date(
      `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}T00:00:00.000Z`,
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toCents(value: unknown): number {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    throw new BillingWebhookValidationError("payment.value is invalid.");
  }
  return Math.round(numeric * 100);
}

function requiredString(value: unknown, path: string): string {
  const result = readString(value);
  if (!result) throw new BillingWebhookValidationError(`${path} is required.`);
  return result;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
