import { createHash } from "node:crypto";
import { billingAuditOutbox } from "@lojaveiculosv2/db";
import type {
  BillingAuditAction,
  BillingAuditIntent,
  BillingAuditMetadata,
} from "../../../domains/billing/ports/billingAuditOutbox.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

const metadataKeys = new Set([
  "catalogVersion",
  "paymentId",
  "planId",
  "providerCheckoutId",
  "providerEventId",
  "providerPaymentId",
  "providerSubscriptionId",
  "quoteId",
  "quotedCents",
  "reason",
  "status",
  "subscriptionId",
]);

export async function enqueueBillingAudit(
  db: DrizzleBillingClient,
  input: {
    action: BillingAuditAction;
    audit: BillingAuditIntent;
    entityId: string;
    entityType: "billing_plan_hire" | "billing_plan_quote" | "subscription";
    idempotencyKey: string;
    metadata: BillingAuditMetadata;
    occurredAt?: Date;
    storeId: string;
    tenantId: string;
  },
) {
  const metadata = sanitizeBillingAuditMetadata(input.metadata);
  await db
    .insert(billingAuditOutbox)
    .values({
      action: input.action,
      actorId: bounded(input.audit.actorId, "actorId"),
      actorKind: input.audit.actorKind,
      auditId: deterministicBillingAuditId(input.idempotencyKey),
      entityId: input.entityId,
      entityType: input.entityType,
      idempotencyKey: bounded(input.idempotencyKey, "idempotencyKey"),
      metadata,
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      requestId: bounded(input.audit.requestId, "requestId"),
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoNothing({ target: billingAuditOutbox.idempotencyKey });
}

export function deterministicBillingAuditId(idempotencyKey: string): string {
  const hex = createHash("sha256")
    .update(`lojaveiculos:billing-audit:v1\0${idempotencyKey}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "5";
  hex[16] = ((Number.parseInt(hex[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function sanitizeBillingAuditMetadata(
  metadata: BillingAuditMetadata,
): BillingAuditMetadata {
  const safe: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!metadataKeys.has(key)) {
      throw new Error(`Billing audit metadata is not allowed: ${key}.`);
    }
    if (value === undefined) continue;
    if (typeof value !== "number" && typeof value !== "string") {
      throw new Error(`Billing audit metadata is invalid: ${key}.`);
    }
    safe[key] = typeof value === "string" ? bounded(value, key) : value;
  }
  return safe;
}

function bounded(value: string, field: string) {
  if (value.length === 0 || value.length > 191) {
    throw new Error(`Billing audit ${field} length is invalid.`);
  }
  return value;
}
