import { and, eq, inArray, isNull, or } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingPlanHires,
  billingPlanHireTransitions,
} from "@lojaveiculosv2/db";
import type {
  BillingProviderSyncResult,
  SyncBillingProviderCheckoutInput,
} from "../../../domains/billing/ports/billingWebhookRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  checkoutReconciliation,
  validateAndBindCheckoutProviderIdentity,
} from "./drizzleBillingCheckoutIdentity.js";

export async function syncProviderCheckout(
  db: DrizzleBillingClient,
  input: SyncBillingProviderCheckoutInput,
): Promise<BillingProviderSyncResult> {
  return db.transaction((tx) =>
    syncProviderCheckoutTransaction(tx as DrizzleBillingClient, input),
  );
}

async function syncProviderCheckoutTransaction(
  db: DrizzleBillingClient,
  input: SyncBillingProviderCheckoutInput,
): Promise<BillingProviderSyncResult> {
  const [beforeCheckout] = await db
    .select()
    .from(billingCheckoutSessions)
    .where(
      and(
        eq(billingCheckoutSessions.provider, input.provider),
        eq(
          billingCheckoutSessions.providerCheckoutId,
          input.providerCheckoutId,
        ),
      ),
    )
    .limit(1)
    .for("update");
  if (!beforeCheckout) {
    return {
      reason: "unknown_checkout",
      status: "pending_reconciliation",
      storeId: null,
      tenantId: null,
    };
  }
  if (!isMonotonicCheckoutTransition(beforeCheckout.status, input.status)) {
    return {
      reason: "non_monotonic_checkout_event",
      status: "pending_reconciliation",
      storeId: beforeCheckout.storeId as never,
      tenantId: beforeCheckout.tenantId as never,
    };
  }

  const identityConflict = await validateAndBindCheckoutProviderIdentity(
    db,
    beforeCheckout,
    input,
  );
  if (identityConflict) return identityConflict;

  const [checkout] = await db
    .update(billingCheckoutSessions)
    .set({
      raw: {
        providerCheckoutId: input.providerCheckoutId,
        status: input.status,
      },
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(billingCheckoutSessions.id, beforeCheckout.id),
        eq(billingCheckoutSessions.status, beforeCheckout.status),
      ),
    )
    .returning();

  if (!checkout) throw new Error("Billing checkout changed concurrently.");

  if (input.status === "paid") {
    const [before] = await db
      .select()
      .from(billingPlanHires)
      .where(eq(billingPlanHires.id, checkout.planHireId ?? ""))
      .limit(1);
    if (!before || before.status === "paid_active") {
      return {
        status: "synced",
        storeId: checkout.storeId as never,
        tenantId: checkout.tenantId as never,
      };
    }
    if (
      ![
        "created",
        "checkout_created",
        "payment_pending",
        "activation_pending",
      ].includes(before.status)
    ) {
      return {
        reason: "non_monotonic_checkout_event",
        status: "pending_reconciliation",
        storeId: checkout.storeId as never,
        tenantId: checkout.tenantId as never,
      };
    }
    const [hire] = await db
      .update(billingPlanHires)
      .set({
        ...(input.providerSubscriptionId
          ? { providerSubscriptionId: input.providerSubscriptionId }
          : {}),
        status: "activation_pending",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(billingPlanHires.id, checkout.planHireId ?? ""),
          eq(billingPlanHires.storeId, checkout.storeId ?? ""),
          eq(billingPlanHires.tenantId, checkout.tenantId),
          inArray(billingPlanHires.status, [
            "created",
            "checkout_created",
            "payment_pending",
            "activation_pending",
          ]),
          ...(input.providerSubscriptionId
            ? [
                or(
                  isNull(billingPlanHires.providerSubscriptionId),
                  eq(
                    billingPlanHires.providerSubscriptionId,
                    input.providerSubscriptionId,
                  ),
                ),
              ]
            : []),
        ),
      )
      .returning();
    if (hire) {
      await db.insert(billingPlanHireTransitions).values({
        fromStatus: before.status,
        hireId: hire.id,
        metadata: { providerCheckoutId: input.providerCheckoutId },
        storeId: hire.storeId,
        tenantId: hire.tenantId,
        toStatus: "activation_pending",
      });
    } else {
      return checkoutReconciliation(
        checkout,
        "provider_subscription_identity_conflict",
      );
    }
  }

  if (input.status === "cancelled" || input.status === "expired") {
    const [before] = await db
      .select()
      .from(billingPlanHires)
      .where(eq(billingPlanHires.id, checkout.planHireId ?? ""))
      .limit(1);
    if (
      before &&
      ["created", "checkout_created", "payment_pending"].includes(before.status)
    ) {
      const [hire] = await db
        .update(billingPlanHires)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(billingPlanHires.id, before.id),
            eq(billingPlanHires.storeId, checkout.storeId ?? ""),
            eq(billingPlanHires.tenantId, checkout.tenantId),
            inArray(billingPlanHires.status, [
              "created",
              "checkout_created",
              "payment_pending",
            ]),
          ),
        )
        .returning();
      if (hire) {
        await db.insert(billingPlanHireTransitions).values({
          fromStatus: before.status,
          hireId: hire.id,
          metadata: { providerCheckoutId: input.providerCheckoutId },
          storeId: hire.storeId,
          tenantId: hire.tenantId,
          toStatus: input.status,
        });
      }
    }
  }

  return {
    status: "synced",
    storeId: checkout.storeId as never,
    tenantId: checkout.tenantId as never,
  };
}

export function isMonotonicCheckoutTransition(
  current: "cancelled" | "created" | "expired" | "paid",
  incoming: "cancelled" | "created" | "expired" | "paid",
): boolean {
  if (current === incoming) return true;
  return current === "created" && incoming !== "created";
}
