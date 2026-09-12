import { desc, eq } from "drizzle-orm";
import { billingCheckoutSessions, billingPlanHires } from "@lojaveiculosv2/db";
import type {
  BillingPlanHireRepository,
  BillingPlanHireStatus,
} from "../../../domains/billing/ports/billingPlanHireRepository.js";
import type { DrizzleBillingClient } from "./drizzleBillingRepository.js";
import {
  isTerminalPlanHire,
  recordPlanHireTransition,
  scopedPlanHire,
  toPlanHire,
} from "./drizzleBillingPlanHireSupport.js";

export {
  beginPlanHireCheckoutRequest,
  bindPlanHireCheckout,
  statusAfterCheckoutBinding,
} from "./drizzleBillingPlanHireCheckoutLifecycle.js";
export {
  bindPlanHireRenewal,
  restorePlanHireFreeDowngradeCancellation,
  schedulePlanHireFreeDowngrade,
  supersedePlanHireFreeDowngrade,
} from "./drizzleBillingPlanHireRenewalLifecycle.js";

type RepositoryInput<K extends keyof BillingPlanHireRepository> = Parameters<
  BillingPlanHireRepository[K]
>[0];

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
