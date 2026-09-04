import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import {
  billingCheckoutSessions,
  billingPlanHires,
  billingPlanHireTransitions,
} from "@lojaveiculosv2/db";
import type {
  BillingPlanHireRepository,
  BillingPlanHireStatus,
} from "../../../domains/billing/ports/billingPlanHireRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  recordPlanHireTransition,
  scopedPlanHire,
  toPlanHire,
} from "./drizzleBillingPlanHireSupport.js";

type RepositoryInput<K extends keyof BillingPlanHireRepository> = Parameters<
  BillingPlanHireRepository[K]
>[0];

// P2 mitigation: Asaas has no checkout lookup by external reference. A request
// can only be reclaimed after the configured 60-minute checkout has expired,
// plus a five-minute safety margin, and only while no provider identity exists.
const CHECKOUT_REQUEST_RECLAIM_AFTER_MS = 65 * 60 * 1_000;

export function checkoutRequestCanBeClaimed(input: {
  hasCheckout: boolean;
  now: Date;
  providerCheckoutId: string | null;
  providerSubscriptionId: string | null;
  status: BillingPlanHireStatus;
  updatedAt: Date;
}): boolean {
  if (
    input.hasCheckout ||
    input.providerCheckoutId ||
    input.providerSubscriptionId
  ) {
    return false;
  }
  if (input.status === "created") return true;
  return (
    input.status === "payment_pending" &&
    input.updatedAt.getTime() <=
      input.now.getTime() - CHECKOUT_REQUEST_RECLAIM_AFTER_MS
  );
}

export async function beginPlanHireCheckoutRequest(
  db: DrizzleBillingClient,
  input: RepositoryInput<"beginCheckoutRequest">,
) {
  return db.transaction(async (tx) => {
    const txDb = tx as DrizzleBillingClient;
    await txDb.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.tenantId}:${input.storeId}:${input.hireId}:checkout-request`}, 31))`,
    );
    const [before] = await txDb
      .select()
      .from(billingPlanHires)
      .where(scopedPlanHire(input))
      .limit(1);
    if (!before) throw new Error("Billing plan hire was not found.");
    const now = new Date();
    const [existingCheckout] = await txDb
      .select({ id: billingCheckoutSessions.id })
      .from(billingCheckoutSessions)
      .where(eq(billingCheckoutSessions.planHireId, input.hireId))
      .limit(1);
    if (
      !checkoutRequestCanBeClaimed({
        hasCheckout: Boolean(existingCheckout),
        now,
        providerCheckoutId: before.providerCheckoutId,
        providerSubscriptionId: before.providerSubscriptionId,
        status: before.status,
        updatedAt: before.updatedAt,
      })
    ) {
      return currentPlanHire(txDb, input);
    }
    const reclaimBefore = new Date(
      now.getTime() - CHECKOUT_REQUEST_RECLAIM_AFTER_MS,
    );
    const [hire] = await txDb
      .update(billingPlanHires)
      .set({ status: "payment_pending", updatedAt: now })
      .where(
        and(
          scopedPlanHire(input),
          isNull(billingPlanHires.providerCheckoutId),
          isNull(billingPlanHires.providerSubscriptionId),
          sql`not exists (
            select 1 from ${billingCheckoutSessions}
            where ${billingCheckoutSessions.planHireId} = ${billingPlanHires.id}
          )`,
          or(
            eq(billingPlanHires.status, "created"),
            and(
              eq(billingPlanHires.status, "payment_pending"),
              lte(billingPlanHires.updatedAt, reclaimBefore),
            ),
          ),
        ),
      )
      .returning();
    if (hire) {
      await txDb.insert(billingPlanHireTransitions).values({
        fromStatus: before.status,
        hireId: hire.id,
        metadata: {
          kind: "checkout_request_started",
          requestId: input.requestId ?? null,
        },
        storeId: hire.storeId,
        tenantId: hire.tenantId,
        toStatus: "payment_pending",
      });
      return { claimed: true, hire: toPlanHire(hire, null) };
    }

    return currentPlanHire(txDb, input);
  });
}

async function currentPlanHire(
  db: DrizzleBillingClient,
  input: RepositoryInput<"beginCheckoutRequest">,
) {
  const [current] = await db
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
  if (!current) throw new Error("Billing plan hire was not found.");
  return {
    claimed: false,
    hire: toPlanHire(current.hire, current.checkoutUrl),
  };
}

export {
  bindPlanHireCheckout,
  checkoutIdentityCanBind,
  statusAfterCheckoutBinding,
} from "./drizzleBillingPlanHireCheckoutBinding.js";
