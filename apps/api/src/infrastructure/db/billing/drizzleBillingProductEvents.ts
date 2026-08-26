import {
  billingProductEventNames,
  billingProductEventOutbox,
  type BillingProductEventName,
} from "@lojaveiculosv2/db";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export { billingProductEventNames };

const propertyKeys = new Set([
  "catalogVersion",
  "checkoutMode",
  "failureCode",
  "planId",
  "quotedCents",
  "reason",
  "source",
  "status",
]);

export async function recordBillingProductEvent(
  db: DrizzleBillingClient,
  input: {
    eventName: BillingProductEventName;
    hireId?: string | null | undefined;
    idempotencyKey: string;
    occurredAt?: Date;
    properties?: Record<string, boolean | number | string | null>;
    providerCheckoutId?: string | null | undefined;
    providerEventId?: string | null | undefined;
    providerPaymentId?: string | null | undefined;
    providerSubscriptionId?: string | null | undefined;
    requestId?: string | null | undefined;
    storeId?: string | null | undefined;
    tenantId: string;
  },
) {
  const properties = sanitizeBillingProductEventProperties(
    input.properties ?? {},
  );
  await db
    .insert(billingProductEventOutbox)
    .values({
      eventName: input.eventName,
      hireId: input.hireId ?? null,
      idempotencyKey: input.idempotencyKey,
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      properties,
      providerCheckoutId: input.providerCheckoutId ?? null,
      providerEventId: input.providerEventId ?? null,
      providerPaymentId: input.providerPaymentId ?? null,
      providerSubscriptionId: input.providerSubscriptionId ?? null,
      requestId: input.requestId ?? null,
      storeId: input.storeId ?? null,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({ target: billingProductEventOutbox.idempotencyKey });
}

export function sanitizeBillingProductEventProperties(
  properties: Record<string, boolean | number | string | null>,
) {
  const sanitized: Record<string, boolean | number | string | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (!propertyKeys.has(key)) {
      throw new Error(`Billing product event property is not allowed: ${key}.`);
    }
    if (typeof value === "string" && value.length > 191) {
      throw new Error(`Billing product event property is too long: ${key}.`);
    }
    sanitized[key] = value;
  }
  return sanitized;
}
