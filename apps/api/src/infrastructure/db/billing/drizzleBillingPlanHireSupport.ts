import { and, eq } from "drizzle-orm";
import {
  billingPlanHires,
  billingPlanHireTransitions,
} from "@lojaveiculosv2/db";
import type { billingPlanQuotes, plans } from "@lojaveiculosv2/db";
import {
  BillingPlanHireRepositoryError,
  type BillingPhase,
  type BillingPlanHireRecord,
  type BillingPlanHireStatus,
} from "../../../domains/billing/ports/billingPlanHireRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

export async function recordPlanHireTransition(
  db: DrizzleBillingClient,
  hire: typeof billingPlanHires.$inferSelect,
  fromStatus: BillingPlanHireStatus | null,
  toStatus: BillingPlanHireStatus,
  failureCode?: string,
) {
  await db.insert(billingPlanHireTransitions).values({
    failureCode: failureCode ?? null,
    fromStatus,
    hireId: hire.id,
    metadata: {},
    storeId: hire.storeId,
    tenantId: hire.tenantId,
    toStatus,
  });
}

export function toPlanHire(
  row: typeof billingPlanHires.$inferSelect,
  checkoutUrl: string | null,
): BillingPlanHireRecord {
  const snapshot = row.planSnapshot as BillingPlanHireRecord["planSnapshot"];
  return {
    activatedAt: row.activatedAt,
    catalogVersion: row.catalogVersion,
    checkoutMode: row.checkoutMode,
    checkoutUrl,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    effectiveAt: row.effectiveAt,
    failureCode: row.failureCode,
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    phase: planHirePhase(row),
    planId: row.planId,
    planSnapshot: snapshot,
    providerCheckoutId: row.providerCheckoutId,
    providerPaymentId: row.providerPaymentId,
    providerSubscriptionId: row.providerSubscriptionId,
    quotedCents: row.quotedCents,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
    updatedAt: row.updatedAt,
  };
}

export function toPlanQuote(row: typeof billingPlanQuotes.$inferSelect) {
  return {
    catalogVersion: row.catalogVersion,
    expiresAt: row.expiresAt,
    id: row.id,
    planId: row.planId,
    quotedCents: row.quotedCents,
    status: row.status,
    storeId: row.storeId as never,
    tenantId: row.tenantId as never,
  };
}

export function planCheckoutMode(plan: typeof plans.$inferSelect) {
  const limits = asRecord(plan.limits);
  const checkoutMode = limits.checkout_mode ?? limits.checkoutMode;
  if (checkoutMode === "quote_required" || plan.code === "escala") {
    return "quote_required" as const;
  }
  return plan.monthlyPriceCents === 0
    ? ("free" as const)
    : ("checkout" as const);
}

export function planSelectionRank(plan: typeof plans.$inferSelect): number {
  const limits = asRecord(plan.limits);
  const value = limits.selection_rank ?? limits.selectionRank;
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

export function scopedPlanHire(input: {
  hireId: string;
  storeId: string;
  tenantId: string;
}) {
  return and(
    eq(billingPlanHires.id, input.hireId),
    eq(billingPlanHires.storeId, input.storeId),
    eq(billingPlanHires.tenantId, input.tenantId),
  );
}

export function unavailablePlanHire(code: string) {
  return new BillingPlanHireRepositoryError(
    code,
    "The requested billing plan is unavailable for this store.",
  );
}

export function isTerminalPlanHire(status: string): boolean {
  return ["paid_active", "cancelled", "expired", "failed"].includes(status);
}

function planHirePhase(
  row: typeof billingPlanHires.$inferSelect,
): BillingPhase {
  if (row.status === "paid_active")
    return row.quotedCents === 0 ? "free_active" : "paid_active";
  if (row.status === "created") return "checkout_creating";
  if (row.status === "checkout_created") return "checkout_created";
  if (row.status === "payment_pending") return "payment_pending";
  if (row.status === "activation_pending") return "activation_pending";
  if (row.status === "downgrade_scheduled") return "downgrade_scheduled";
  if (row.status === "cancelled") return "checkout_cancelled";
  if (row.status === "expired") return "checkout_expired";
  if (row.status === "failed") return "checkout_failed";
  return "reconciliation_failed";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
