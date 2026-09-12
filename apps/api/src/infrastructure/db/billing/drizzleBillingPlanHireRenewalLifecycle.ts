import { and, eq, ne, sql } from "drizzle-orm";
import { billingPlanHires, plans, subscriptions } from "@lojaveiculosv2/db";
import type { BillingPlanHireRepository } from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { scheduleFreePlanContract } from "./drizzleBillingPlanHireContracts.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  cancelSubscriptionCancellationIntent,
  enqueueSubscriptionCancellation,
} from "./drizzleBillingSubscriptionCancellation.js";
import {
  recordPlanHireTransition,
  scopedPlanHire,
  toPlanHire,
  unavailablePlanHire,
} from "./drizzleBillingPlanHireSupport.js";

type RepositoryInput<K extends keyof BillingPlanHireRepository> = Parameters<
  BillingPlanHireRepository[K]
>[0];

export async function bindPlanHireRenewal(
  db: DrizzleBillingClient,
  input: RepositoryInput<"bindRenewal">,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    const [before] = await txDb
      .select()
      .from(billingPlanHires)
      .where(scopedPlanHire(input))
      .limit(1);
    if (!before) throw new Error("Billing plan hire was not found.");
    const [hire] = await txDb
      .update(billingPlanHires)
      .set({
        effectiveAt: input.effectiveAt,
        providerSubscriptionId: input.providerSubscriptionId,
        status: "payment_pending",
        updatedAt: new Date(),
      })
      .where(scopedPlanHire(input))
      .returning();
    if (!hire) throw new Error("Billing plan hire was not found.");
    await recordPlanHireTransition(
      txDb,
      hire,
      before.status,
      "payment_pending",
    );
    return toPlanHire(hire, null);
  });
}

export async function supersedePlanHireFreeDowngrade(
  db: DrizzleBillingClient,
  input: RepositoryInput<"supersedeFreeDowngrade">,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    await txDb.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:plan-hire`}, 31))`,
    );
    const [hire] = await txDb
      .select({
        hire: billingPlanHires,
        providerSubscriptionId: subscriptions.providerSubscriptionId,
      })
      .from(billingPlanHires)
      .innerJoin(
        subscriptions,
        and(
          eq(subscriptions.id, billingPlanHires.subscriptionId),
          eq(subscriptions.tenantId, billingPlanHires.tenantId),
          eq(subscriptions.storeId, billingPlanHires.storeId),
        ),
      )
      .where(scopedPlanHire(input))
      .limit(1);
    if (!hire) throw new Error("Billing plan hire was not found.");
    return cancelSubscriptionCancellationIntent(txDb, {
      cancelledAt: new Date(),
      providerSubscriptionId: hire.providerSubscriptionId,
      storeId: input.storeId,
      subscriptionId: hire.hire.subscriptionId,
      tenantId: input.tenantId,
    });
  });
}

export async function restorePlanHireFreeDowngradeCancellation(
  db: DrizzleBillingClient,
  input: RepositoryInput<"restoreFreeDowngradeCancellation">,
) {
  await db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    await txDb.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:plan-hire`}, 31))`,
    );
    const [hire] = await txDb
      .select({ subscriptionId: billingPlanHires.subscriptionId })
      .from(billingPlanHires)
      .where(scopedPlanHire(input))
      .limit(1);
    if (!hire) throw new Error("Billing plan hire was not found.");
    const [subscription] = await txDb
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, hire.subscriptionId),
          eq(subscriptions.tenantId, input.tenantId),
          eq(subscriptions.storeId, input.storeId),
          eq(
            subscriptions.providerSubscriptionId,
            input.providerSubscriptionId,
          ),
        ),
      )
      .limit(1);
    const [downgrade] = await txDb
      .select({ id: billingPlanHires.id })
      .from(billingPlanHires)
      .where(
        and(
          ne(billingPlanHires.id, input.hireId),
          eq(billingPlanHires.subscriptionId, hire.subscriptionId),
          eq(billingPlanHires.tenantId, input.tenantId),
          eq(billingPlanHires.storeId, input.storeId),
          eq(billingPlanHires.status, "downgrade_scheduled"),
        ),
      )
      .limit(1);
    if (!subscription || !downgrade) return;
    await enqueueSubscriptionCancellation(txDb, {
      availableAt: new Date(),
      providerSubscriptionId: input.providerSubscriptionId,
      storeId: input.storeId,
      subscriptionId: hire.subscriptionId,
      tenantId: input.tenantId,
    });
  });
}

export async function schedulePlanHireFreeDowngrade(
  db: DrizzleBillingClient,
  input: RepositoryInput<"scheduleFreeDowngrade">,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    await txDb.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:plan-hire`}, 31))`,
    );
    const [before] = await txDb
      .select()
      .from(billingPlanHires)
      .where(scopedPlanHire(input))
      .limit(1);
    if (!before || before.checkoutMode !== "free") {
      throw unavailablePlanHire("free_downgrade_unavailable");
    }
    const [plan] = await txDb
      .select()
      .from(plans)
      .where(eq(plans.id, before.planId))
      .limit(1);
    const [subscription] = await txDb
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, before.subscriptionId),
          eq(subscriptions.tenantId, before.tenantId),
        ),
      )
      .limit(1);
    if (!plan || !subscription) {
      throw unavailablePlanHire("free_downgrade_unavailable");
    }
    if (
      before.status === "downgrade_scheduled" &&
      before.effectiveSubscriptionItemId
    ) {
      await enqueueCancellation(txDb, input, subscription);
      return toPlanHire(before, null);
    }
    const activation = await scheduleFreePlanContract(txDb, {
      effectiveAt: input.effectiveAt,
      plan,
      storeId: input.storeId,
      subscription,
      tenantId: input.tenantId,
    });
    const [hire] = await txDb
      .update(billingPlanHires)
      .set({
        effectiveSubscriptionItemId: activation.itemId,
        status: activation.status,
        updatedAt: new Date(),
      })
      .where(scopedPlanHire(input))
      .returning();
    if (!hire) throw new Error("Billing plan hire was not found.");
    await recordPlanHireTransition(
      txDb,
      hire,
      before.status,
      activation.status,
    );
    await enqueueCancellation(txDb, input, subscription);
    return toPlanHire(hire, null);
  });
}

async function enqueueCancellation(
  db: DrizzleBillingClient,
  input: RepositoryInput<"scheduleFreeDowngrade">,
  subscription: typeof subscriptions.$inferSelect,
) {
  await enqueueSubscriptionCancellation(db, {
    availableAt: new Date(),
    providerSubscriptionId: subscription.providerSubscriptionId,
    storeId: input.storeId,
    subscriptionId: subscription.id,
    tenantId: input.tenantId,
  });
}
