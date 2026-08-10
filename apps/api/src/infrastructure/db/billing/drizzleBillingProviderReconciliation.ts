import { and, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import {
  billingAddonContracts,
  billingProviderReconciliations,
  subscriptions,
} from "@lojaveiculosv2/db";
import type { BillingProviderReconciliationRepository } from "../../../domains/billing/ports/billingProviderReconciliation.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";

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
            eq(subscriptions.id, billingProviderReconciliations.subscriptionId),
          )
          .where(
            and(
              isNotNull(subscriptions.currentPeriodEnd),
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
            ),
          )
          .orderBy(billingProviderReconciliations.availableAt)
          .limit(1)
          .for("update", { skipLocked: true });
        if (!candidate?.subscription.currentPeriodEnd) return null;
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
              nextDueAt: candidate.subscription.currentPeriodEnd,
              processingToken: input.processingToken,
              subscriptionId: claimed.subscriptionId,
              tenantId: claimed.tenantId as never,
            }
          : null;
      }),
    markRetry: async (input) => {
      const [updated] = await db
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
        .returning({ id: billingProviderReconciliations.id });
      return Boolean(updated);
    },
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
        if (!updated) return false;
        if (updated.kind === "zapi_cancellation") {
          await client
            .update(billingAddonContracts)
            .set({
              cancellationSyncPending: false,
              updatedAt: input.completedAt,
            })
            .where(
              and(
                eq(
                  billingAddonContracts.subscriptionId,
                  updated.subscriptionId,
                ),
                eq(billingAddonContracts.cancellationSyncPending, true),
              ),
            );
        }
        return true;
      }),
  };
}

export async function enqueueZapiCancellationReconciliation(
  db: DrizzleBillingClient,
  input: { subscriptionId: string; tenantId: string },
) {
  await db
    .insert(billingProviderReconciliations)
    .values({
      kind: "zapi_cancellation",
      subscriptionId: input.subscriptionId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: {
        availableAt: new Date(),
        completedAt: null,
        lastError: null,
        status: "queued",
        updatedAt: new Date(),
      },
      target: [
        billingProviderReconciliations.kind,
        billingProviderReconciliations.subscriptionId,
      ],
    });
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
