import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import {
  billingProviderReconciliations,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { BillingProviderReconciliationRepository } from "../../../domains/billing/ports/billingProviderReconciliation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";

export function createDrizzleBillingProviderReconciliationRepository(
  db: DrizzleBillingClient,
): BillingProviderReconciliationRepository {
  return {
    claimNext: (input) =>
      db.transaction(async (tx) => {
        const client = tx as DrizzleBillingClient;
        const [candidate] = await client
          .select({
            reconciliation: billingProviderReconciliations,
            subscription: subscriptions,
          })
          .from(billingProviderReconciliations)
          .innerJoin(
            subscriptions,
            and(
              eq(
                subscriptions.id,
                billingProviderReconciliations.subscriptionId,
              ),
              eq(
                subscriptions.tenantId,
                billingProviderReconciliations.tenantId,
              ),
              eq(subscriptions.storeId, billingProviderReconciliations.storeId),
            ),
          )
          .where(
            or(
              and(
                inArray(billingProviderReconciliations.status, [
                  "queued",
                  "retry",
                ]),
                lte(billingProviderReconciliations.availableAt, input.now),
              ),
              and(
                eq(billingProviderReconciliations.status, "processing"),
                lte(
                  billingProviderReconciliations.processingStartedAt,
                  input.staleBefore,
                ),
              ),
            ),
          )
          .orderBy(billingProviderReconciliations.availableAt)
          .limit(1)
          .for("update", { skipLocked: true });
        if (!candidate) return null;
        const [claimed] = await client
          .update(billingProviderReconciliations)
          .set({
            attemptCount: sql`${billingProviderReconciliations.attemptCount} + 1`,
            lastError: null,
            processingStartedAt: input.now,
            processingToken: input.processingToken,
            status: "processing",
            updatedAt: input.now,
          })
          .where(
            eq(billingProviderReconciliations.id, candidate.reconciliation.id),
          )
          .returning();
        return claimed
          ? {
              attemptCount: claimed.attemptCount,
              id: claimed.id,
              kind: claimed.kind,
              nextDueAt: reconciliationDate(candidate),
              processingToken: input.processingToken,
              targetProviderSubscriptionId:
                claimed.targetProviderSubscriptionId,
              storeId: claimed.storeId as never,
              subscriptionId: claimed.subscriptionId,
              tenantId: claimed.tenantId as never,
            }
          : null;
      }),
    markRetry: (input) =>
      db.transaction(async (tx) => {
        const client = tx as DrizzleBillingClient;
        const [updated] = await client
          .update(billingProviderReconciliations)
          .set({
            availableAt: input.availableAt,
            lastError: input.errorMessage.slice(0, 2_000),
            processingStartedAt: null,
            processingToken: null,
            status: "retry",
            updatedAt: new Date(),
          })
          .where(claimFilter(input))
          .returning();
        if (!updated) return false;
        await recordBillingProductEvent(client, {
          eventName: "reconciliation_failed",
          idempotencyKey: `billing-provider-reconciliation:${updated.id}:attempt:${updated.attemptCount}`,
          properties: {
            failureCode: "provider_reconciliation_retry",
            source: updated.kind,
          },
          storeId: updated.storeId,
          tenantId: updated.tenantId,
        });
        return true;
      }),
    markSucceeded: (input) =>
      db.transaction(async (tx) => {
        const client = tx as DrizzleBillingClient;
        const [updated] = await client
          .update(billingProviderReconciliations)
          .set({
            completedAt: input.completedAt,
            processingStartedAt: null,
            processingToken: null,
            status: "succeeded",
            updatedAt: input.completedAt,
          })
          .where(claimFilter(input))
          .returning();
        if (updated && input.cancelledProviderSubscriptionId) {
          await client
            .update(subscriptions)
            .set({ providerSubscriptionId: null, updatedAt: input.completedAt })
            .where(
              and(
                eq(subscriptions.id, updated.subscriptionId),
                eq(subscriptions.tenantId, updated.tenantId),
                eq(subscriptions.storeId, updated.storeId),
                eq(
                  subscriptions.providerSubscriptionId,
                  input.cancelledProviderSubscriptionId,
                ),
              ),
            );
        }
        return Boolean(updated);
      }),
  };
}

function reconciliationDate(candidate: {
  reconciliation: typeof billingProviderReconciliations.$inferSelect;
  subscription: typeof subscriptions.$inferSelect;
}) {
  return deriveReconciliationDate({
    createdAt: candidate.reconciliation.createdAt,
    currentPeriodEnd: candidate.subscription.currentPeriodEnd,
    currentPeriodStart: candidate.subscription.currentPeriodStart,
  });
}

export function deriveReconciliationDate(input: {
  createdAt: Date;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
}) {
  if (input.currentPeriodEnd) return input.currentPeriodEnd;
  const basis = input.currentPeriodStart ?? input.createdAt;
  const nextDueAt = new Date(basis);
  nextDueAt.setUTCMonth(nextDueAt.getUTCMonth() + 1);
  return nextDueAt;
}

function claimFilter(input: {
  processingToken: string;
  reconciliationId: string;
}) {
  return and(
    eq(billingProviderReconciliations.id, input.reconciliationId),
    eq(billingProviderReconciliations.status, "processing"),
    eq(billingProviderReconciliations.processingToken, input.processingToken),
  );
}
