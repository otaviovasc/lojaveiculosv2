import { and, desc, eq, sql } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingPlanHires,
  plans,
  subscriptions,
} from "@lojaveiculosv2/db";
import type {
  BillingPlanHireRepository,
  BillingPlanHireStatus,
} from "../../../domains/billing/ports/billingPlanHireRepository.js";
import { scheduleFreePlanContract } from "./drizzleBillingPlanHireContracts.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import { recordBillingProductEvent } from "./drizzleBillingProductEvents.js";
import {
  isTerminalPlanHire,
  recordPlanHireTransition,
  scopedPlanHire,
  toPlanHire,
  unavailablePlanHire,
} from "./drizzleBillingPlanHireSupport.js";

type RepositoryInput<K extends keyof BillingPlanHireRepository> = Parameters<
  BillingPlanHireRepository[K]
>[0];

export async function bindPlanHireCheckout(
  db: DrizzleBillingClient,
  input: RepositoryInput<"bindCheckout">,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    const [before] = await txDb
      .select()
      .from(billingPlanHires)
      .where(scopedPlanHire(input))
      .limit(1);
    if (!before) throw new Error("Billing plan hire was not found.");
    const nextStatus = statusAfterCheckoutBinding(before.status);
    const [hire] = await txDb
      .update(billingPlanHires)
      .set({
        providerCheckoutId: input.providerCheckoutId,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(scopedPlanHire(input))
      .returning();
    if (!hire) throw new Error("Billing plan hire was not found.");
    await txDb.insert(billingCheckoutSessions).values({
      callbackUrls: input.callbackUrls,
      checkoutUrl: input.checkoutUrl,
      expiresAt: input.expiresAt,
      externalReference: hire.id,
      planHireId: hire.id,
      provider: "asaas",
      providerCheckoutId: input.providerCheckoutId,
      raw: input.raw,
      status: "created",
      storeId: hire.storeId,
      subscriptionId: hire.subscriptionId,
      tenantId: hire.tenantId,
    });
    if (before.status !== nextStatus) {
      await recordPlanHireTransition(txDb, hire, before.status, nextStatus);
    }
    await recordBillingProductEvent(txDb, {
      eventName: "checkout_created",
      hireId: hire.id,
      idempotencyKey: `billing-checkout:${input.providerCheckoutId}:created`,
      providerCheckoutId: input.providerCheckoutId,
      requestId: input.requestId ?? null,
      storeId: hire.storeId,
      tenantId: hire.tenantId,
    });
    await recordBillingProductEvent(txDb, {
      eventName: "provider_bound",
      hireId: hire.id,
      idempotencyKey: `billing-hire:${hire.id}:checkout-bound`,
      providerCheckoutId: input.providerCheckoutId,
      requestId: input.requestId ?? null,
      storeId: hire.storeId,
      tenantId: hire.tenantId,
    });
    return toPlanHire(hire, input.checkoutUrl);
  });
}

export function statusAfterCheckoutBinding(
  status: BillingPlanHireStatus,
): BillingPlanHireStatus {
  return status === "created" ? "checkout_created" : status;
}

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

export async function failBillingPlanHire(
  db: DrizzleBillingClient,
  input: RepositoryInput<"failHire">,
) {
  await db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    const [before] = await txDb
      .select()
      .from(billingPlanHires)
      .where(scopedPlanHire(input))
      .limit(1);
    if (!before || isTerminalPlanHire(before.status)) return;
    const [hire] = await txDb
      .update(billingPlanHires)
      .set({
        failureCode: input.failureCode,
        status: "failed",
        updatedAt: new Date(),
      })
      .where(scopedPlanHire(input))
      .returning();
    if (hire) {
      await recordPlanHireTransition(
        txDb,
        hire,
        before.status as BillingPlanHireStatus,
        "failed",
        input.failureCode,
      );
    }
  });
}

export async function findBillingPlanHire(
  db: DrizzleBillingClient,
  input: RepositoryInput<"findHire">,
) {
  const [row] = await db
    .select({
      checkoutUrl: billingCheckoutSessions.checkoutUrl,
      hire: billingPlanHires,
    })
    .from(billingPlanHires)
    .leftJoin(
      billingCheckoutSessions,
      eq(billingCheckoutSessions.planHireId, billingPlanHires.id),
    )
    .where(scopedPlanHire(input))
    .orderBy(desc(billingCheckoutSessions.createdAt))
    .limit(1);
  return row ? toPlanHire(row.hire, row.checkoutUrl) : null;
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
    return toPlanHire(hire, null);
  });
}
