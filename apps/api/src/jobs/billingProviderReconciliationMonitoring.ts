import * as productSchema from "@lojaveiculosv2/db";
import {
  and,
  asc,
  count,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lte,
  notExists,
  or,
} from "drizzle-orm";
import type { DrizzleBillingClient } from "../infrastructure/db/billing/drizzleBillingRepository.js";

export async function billingMonitoringSnapshot(db: DrizzleBillingClient) {
  const now = new Date();
  const recentSince = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const [
    pendingEvents,
    pendingEventCount,
    failedHires,
    missingContracts,
    activationFailures,
    recentGraceEntries,
    recentFreeFallbacks,
    pendingBillingAudits,
    pendingBillingAuditCount,
    deadLetterBillingAuditCount,
  ] = await Promise.all([
    db
      .select({ createdAt: productSchema.providerEvents.createdAt })
      .from(productSchema.providerEvents)
      .where(
        and(
          eq(productSchema.providerEvents.provider, "asaas"),
          eq(productSchema.providerEvents.status, "pending_reconciliation"),
        ),
      )
      .orderBy(asc(productSchema.providerEvents.createdAt))
      .limit(1),
    db
      .select({ count: count() })
      .from(productSchema.providerEvents)
      .where(
        and(
          eq(productSchema.providerEvents.provider, "asaas"),
          eq(productSchema.providerEvents.status, "pending_reconciliation"),
        ),
      ),
    db
      .select({ count: count() })
      .from(productSchema.billingPlanHires)
      .where(eq(productSchema.billingPlanHires.status, "reconciliation_failed"))
      .limit(1),
    db
      .select({ count: count() })
      .from(productSchema.stores)
      .where(
        and(
          eq(productSchema.stores.isDeleted, false),
          isNull(productSchema.stores.deletedAt),
          notExists(
            db
              .select({ id: productSchema.subscriptionItems.id })
              .from(productSchema.subscriptionItems)
              .where(
                and(
                  eq(
                    productSchema.subscriptionItems.storeId,
                    productSchema.stores.id,
                  ),
                  eq(productSchema.subscriptionItems.itemType, "plan"),
                  or(
                    isNull(productSchema.subscriptionItems.startsAt),
                    lte(productSchema.subscriptionItems.startsAt, now),
                  ),
                  or(
                    isNull(productSchema.subscriptionItems.endsAt),
                    gt(productSchema.subscriptionItems.endsAt, now),
                  ),
                ),
              ),
          ),
        ),
      ),
    db
      .select({ count: count() })
      .from(productSchema.providerEvents)
      .where(
        and(
          eq(productSchema.providerEvents.provider, "asaas"),
          eq(productSchema.providerEvents.status, "failed"),
          eq(
            productSchema.providerEvents.errorMessage,
            "BillingContractActivationOrProjectionError",
          ),
        ),
      ),
    db
      .select({ count: count() })
      .from(productSchema.billingProductEventOutbox)
      .where(
        and(
          eq(
            productSchema.billingProductEventOutbox.eventName,
            "grace_entered",
          ),
          gte(productSchema.billingProductEventOutbox.occurredAt, recentSince),
        ),
      ),
    db
      .select({ count: count() })
      .from(productSchema.billingProductEventOutbox)
      .where(
        and(
          eq(
            productSchema.billingProductEventOutbox.eventName,
            "free_fallback",
          ),
          gte(productSchema.billingProductEventOutbox.occurredAt, recentSince),
        ),
      ),
    db
      .select({ occurredAt: productSchema.billingAuditOutbox.occurredAt })
      .from(productSchema.billingAuditOutbox)
      .where(
        inArray(productSchema.billingAuditOutbox.state, [
          "pending",
          "delivering",
        ]),
      )
      .orderBy(asc(productSchema.billingAuditOutbox.occurredAt))
      .limit(1),
    db
      .select({ count: count() })
      .from(productSchema.billingAuditOutbox)
      .where(
        inArray(productSchema.billingAuditOutbox.state, [
          "pending",
          "delivering",
        ]),
      ),
    db
      .select({ count: count() })
      .from(productSchema.billingAuditOutbox)
      .where(eq(productSchema.billingAuditOutbox.state, "dead_letter")),
  ]);
  const oldestPending = pendingEvents[0]?.createdAt ?? null;
  const auditHealth = billingAuditHealth({
    deadLetterCount: deadLetterBillingAuditCount[0]?.count ?? 0,
    now,
    oldestPendingAt: pendingBillingAudits[0]?.occurredAt ?? null,
    pendingCount: pendingBillingAuditCount[0]?.count ?? 0,
  });
  return {
    activationOrProjectionFailureCount: activationFailures[0]?.count ?? 0,
    ...auditHealth,
    freeFallbackCount24h: recentFreeFallbacks[0]?.count ?? 0,
    graceEntryCount24h: recentGraceEntries[0]?.count ?? 0,
    missingContractCount: missingContracts[0]?.count ?? 0,
    oldestPendingReconciliationAgeSeconds: oldestPending
      ? Math.max(
          0,
          Math.floor((now.getTime() - oldestPending.getTime()) / 1_000),
        )
      : 0,
    pendingReconciliationCount: pendingEventCount[0]?.count ?? 0,
    reconciliationFailedHireCount: failedHires[0]?.count ?? 0,
    unmatchedWebhookCount: pendingEventCount[0]?.count ?? 0,
  };
}

export function billingAuditHealth(input: {
  deadLetterCount: number;
  now: Date;
  oldestPendingAt: Date | null;
  pendingCount: number;
}) {
  return {
    billingAuditDeadLetterCount: input.deadLetterCount,
    billingAuditPendingCount: input.pendingCount,
    oldestBillingAuditPendingAgeSeconds: input.oldestPendingAt
      ? Math.max(
          0,
          Math.floor(
            (input.now.getTime() - input.oldestPendingAt.getTime()) / 1_000,
          ),
        )
      : 0,
  };
}

export function billingMonitoringNeedsAttention(input: {
  activationOrProjectionFailureCount: number;
  billingAuditDeadLetterCount: number;
  missingContractCount: number;
  oldestBillingAuditPendingAgeSeconds: number;
  oldestPendingReconciliationAgeSeconds: number;
  reconciliationFailedHireCount: number;
}) {
  return (
    input.activationOrProjectionFailureCount > 0 ||
    input.billingAuditDeadLetterCount > 0 ||
    input.missingContractCount > 0 ||
    input.oldestBillingAuditPendingAgeSeconds > 900 ||
    input.oldestPendingReconciliationAgeSeconds > 900 ||
    input.reconciliationFailedHireCount > 0
  );
}
